import { v4 as uuidv4 } from 'uuid'
import { Queue } from 'bullmq'
import { DeploymentRepository, DeploymentProviderFactory } from '@modules/deployment/domain/ports'
import {
  EnvironmentRepository,
  ProjectRepository,
  RepositoryProviderPort,
} from '@modules/project/domain/ports'
import { AuthRepository } from '@modules/auth/domain/ports'
import { SecretRepository } from '@modules/secret/domain/ports'
import { Deployment, DeploymentLog } from '@modules/deployment/domain/entities/Deployment'
import { Environment } from '@modules/project/domain/entities/Project'
import {
  DeploymentJobData,
  DeploymentJobName,
  NotificationJobData,
  NotificationJobName,
  NotificationEventType,
} from '@shared/queue/QueueNames'
import {
  DeploymentNotFoundError,
  DeploymentAccessDeniedError,
  DeploymentAlreadyRunningError,
  StagingGateError,
} from '@modules/deployment/domain/errors/DeploymentErrors'
import { NotFoundError, ForbiddenError, AppError } from '@shared/errors'
import { TriggerDeploymentDto } from '../dto'
import { logger } from '@infra/logger/logger'
import { DeploymentLock } from '@infra/lock/DeploymentLock'
import { env } from '@config/env'

const PRODUCTION_PATTERN = /^prod(uction)?$/i
const STAGING_PATTERN = /^stag(ing)?$/i

export interface EnvironmentDeploymentSummary {
  environmentId: string
  name: string
  branch: string
  platform: string
  platformServiceId: string | null
  status: Environment['status']
  autoDeploy: boolean
  configured: boolean
  isProduction: boolean
  requiresStagingGate: boolean
  ambiguousBranch: boolean
  lastDeployment: {
    id: string
    status: Deployment['status']
    commitSha: string
    commitMessage: string
    startedAt: Date
    completedAt: Date | null
    durationMs: number | null
  } | null
}

export interface DeploymentSummaryView {
  projectId: string
  projectName: string
  repoUrl: string
  webhookUrl: string
  environments: EnvironmentDeploymentSummary[]
}

export class DeploymentService {
  constructor(
    private readonly deploymentRepository: DeploymentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly authRepository: AuthRepository,
    private readonly repositoryProvider: RepositoryProviderPort,
    private readonly providerFactory: DeploymentProviderFactory,
    private readonly secretRepository: SecretRepository,
    private readonly deploymentQueue: Queue,
    private readonly deploymentLock: DeploymentLock,
    private readonly notificationQueue: Queue
  ) {}

  async triggerDeployment(dto: TriggerDeploymentDto, triggeredBy: string): Promise<Deployment> {
    const environment = await this.environmentRepository.findById(dto.environmentId)
    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)
    if (!project) throw new NotFoundError('Project')

    if (project.ownerId !== triggeredBy) throw new ForbiddenError()

    // Staging gate — production deployments require a passing staging deploy
    if (PRODUCTION_PATTERN.test(environment.name)) {
      const projectEnvs = await this.environmentRepository.findByProjectId(environment.projectId)
      const stagingEnv = projectEnvs.find(
        (e) => STAGING_PATTERN.test(e.name) && e.id !== environment.id
      )
      if (stagingEnv) {
        const lastStagingDeploy = await this.deploymentRepository.findLastSuccessful(stagingEnv.id)
        if (!lastStagingDeploy) throw new StagingGateError()
      }
    }

    const acquired = await this.deploymentLock.acquire(dto.environmentId)
    if (!acquired) throw new DeploymentAlreadyRunningError()

    const user = await this.authRepository.findbyId(triggeredBy)
    if (!user || !user.githubToken) {
      await this.deploymentLock.release(dto.environmentId)
      throw new NotFoundError('User Github token')
    }

    const commit = await this.repositoryProvider.getLatestCommit(
      project.repoUrl,
      environment.branch,
      user.githubToken
    )

    const deployment = await this.deploymentRepository.save({
      id: uuidv4(),
      environmentId: environment.id,
      projectId: project.id,
      triggeredBy,
      commitSha: commit.sha,
      commitMessage: commit.message,
      status: 'queued',
      platform: environment.platform,
      platformDeploymentId: null,
      startedAt: new Date(),
      completedAt: null,
    })

    await this.environmentRepository.updateStatus(environment.id, 'deploying')

    const jobData: DeploymentJobData = {
      deploymentId: deployment.id,
      environmentId: environment.id,
      projectId: project.id,
      platform: environment.platform as 'railway' | 'render',
    }

    await this.deploymentQueue.add(DeploymentJobName.PROCESS_DEPLOYMENT, jobData, {
      jobId: deployment.id,
    })

    return deployment
  }

  async processDeployment(jobData: DeploymentJobData): Promise<void> {
    const { deploymentId, environmentId } = jobData

    const deployment = await this.deploymentRepository.findById(deploymentId)
    if (!deployment) {
      logger.error({ deploymentId }, 'Deployment not found in worker')
      await this.deploymentLock.release(environmentId)
      return
    }

    const environment = await this.environmentRepository.findById(environmentId)
    if (!environment) {
      await this.deploymentRepository.complete(deployment.id, 'failed')
      await this.deploymentLock.release(environmentId)
      return
    }

    try {
      await this.deploymentRepository.updateStatus(deploymentId, 'building')
      await this.log(deploymentId, `Starting deployment to ${environment.platform}`)
      await this.log(deploymentId, `Commit: ${deployment.commitSha.slice(0, 7)} — ${deployment.commitMessage}`)

      const secrets = await this.secretRepository.resolveForEnvironment(environmentId)
      const provider = this.providerFactory.get(environment.platform)

      await this.deploymentRepository.updateStatus(deploymentId, 'deploying')
      await this.log(deploymentId, `Calling ${environment.platform} API...`)

      const platformDeploymentId = await provider.deploy(environment, deployment.commitSha, secrets)

      await this.deploymentRepository.updateStatus(deploymentId, 'deploying', platformDeploymentId)
      this.log(deploymentId, `Platform deployment ID: ${platformDeploymentId}`)

      await provider.streamLogs(platformDeploymentId, environment, async (message, level) => {
        await this.deploymentRepository.appendLog(deploymentId, {
          deploymentId,
          message,
          level,
          source: 'platform',
          timestamp: new Date(),
        })
      })

      const finalStatus = await provider.getStatus(platformDeploymentId, environment)
      const succeeded = finalStatus === 'success'

      await this.deploymentRepository.complete(deploymentId, succeeded ? 'success' : 'failed')

      if (succeeded) {
        await this.environmentRepository.updateStatus(environmentId, 'deployed')
        await this.enqueueNotification('deployment_success', deployment, environment)
        logger.info({ deploymentId }, 'Deployment succeeded')
        return
      }

      // Deployment failed — attempt rollback to last stable state
      await this.log(deploymentId, 'Deployment failed — checking for rollback candidate...', 'error')

      const lastGood = await this.deploymentRepository.findLastSuccessful(environmentId)

      if (!lastGood?.platformDeploymentId) {
        await this.log(deploymentId, 'No previous successful deployment found. Marking environment failed.', 'error')
        await this.environmentRepository.updateStatus(environmentId, 'failed')
        await this.enqueueNotification('deployment_failed', deployment, environment)
        logger.error({ deploymentId }, 'Deployment failed, no rollback available')
        return
      }

      await this.log(
        deploymentId,
        `Rolling back to ${lastGood.commitSha.slice(0, 7)} (${lastGood.platformDeploymentId})...`,
        'error'
      )
      await this.environmentRepository.updateStatus(environmentId, 'deploying')

      try {
        const rollbackId = await provider.rollback(
          lastGood.platformDeploymentId,
          lastGood.commitSha,
          environment
        )

        await this.log(deploymentId, `Rollback initiated — platform job: ${rollbackId}`, 'error')

        await provider.streamLogs(rollbackId, environment, async (message, level) => {
          await this.deploymentRepository.appendLog(deploymentId, {
            deploymentId,
            message,
            level,
            source: 'platform',
            timestamp: new Date(),
          })
        })

        const rollbackStatus = await provider.getStatus(rollbackId, environment)
        const rollbackSucceeded = rollbackStatus === 'success'

        await this.environmentRepository.updateStatus(
          environmentId,
          rollbackSucceeded ? 'deployed' : 'failed'
        )

        await this.log(
          deploymentId,
          rollbackSucceeded
            ? `Rollback succeeded — environment restored to ${lastGood.commitSha.slice(0, 7)}`
            : 'Rollback also failed — environment is in a degraded state',
          'error'
        )

        await this.enqueueNotification(
          rollbackSucceeded ? 'rollback_success' : 'rollback_failed',
          deployment,
          environment,
          lastGood.commitSha
        )

        logger.error({ deploymentId, rollbackSucceeded }, 'Deployment failed, rollback attempted')
      } catch (rollbackError) {
        const msg = (rollbackError as Error).message
        await this.log(deploymentId, `Rollback error: ${msg}`, 'error')
        await this.environmentRepository.updateStatus(environmentId, 'failed')
        await this.enqueueNotification('rollback_failed', deployment, environment, lastGood.commitSha)
        logger.error({ deploymentId, err: rollbackError }, 'Rollback threw an exception')
      }
    } catch (error) {
      const exception = error as Error

      await this.deploymentRepository.complete(deploymentId, 'failed')
      await this.environmentRepository.updateStatus(environmentId, 'failed')
      await this.log(deploymentId, `Deployment failed: ${exception.message}`, 'error')
      await this.enqueueNotification('deployment_failed', deployment, environment)

      logger.error({ deploymentId, err: error }, 'Deployment worker threw an exception')
    } finally {
      await this.deploymentLock.release(environmentId)
    }
  }

  // On worker startup: reconcile any in-progress deployments left by a previous crash.
  // Checks the actual platform status before deciding success/failed — so a deployment
  // that completed on Render while our worker was down is recorded as success, not failed.
  async reconcileStaleDeployments(): Promise<void> {
    const stale = await this.deploymentRepository.findInProgress()
    if (stale.length === 0) return

    logger.warn({ count: stale.length }, 'Reconciling stale deployments on startup')

    await Promise.all(
      stale.map(async (d) => {
        let finalStatus: 'success' | 'failed' = 'failed'
        let message = 'Marked failed: worker restarted while deployment was in progress'

        if (d.platformDeploymentId) {
          try {
            const environment = await this.environmentRepository.findById(d.environmentId)
            if (environment) {
              const provider = this.providerFactory.get(environment.platform)
              const platformStatus = await provider.getStatus(d.platformDeploymentId, environment)
              if (platformStatus === 'success') {
                finalStatus = 'success'
                message = 'Marked success: platform confirmed deployment completed while worker was down'
              }
            }
          } catch {
            // Can't reach platform — default to failed
          }
        }

        await this.deploymentRepository.complete(d.id, finalStatus)
        await this.deploymentRepository.appendLog(d.id, {
          deploymentId: d.id,
          message,
          level: finalStatus === 'success' ? 'info' : 'error',
          source: 'system',
          timestamp: new Date(),
        })
        await this.deploymentLock.release(d.environmentId)
        const env = await this.environmentRepository.findById(d.environmentId)
        if (env) {
          await this.environmentRepository.updateStatus(
            d.environmentId,
            finalStatus === 'success' ? 'deployed' : 'failed'
          )
        }
        logger.warn({ deploymentId: d.id, finalStatus }, 'Stale deployment reconciled')
      })
    )
  }

  async cancelActiveForEnvironment(environmentId: string, requestingUserId: string): Promise<void> {
    const environment = await this.environmentRepository.findById(environmentId)
    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)
    if (!project || project.ownerId !== requestingUserId) throw new ForbiddenError()

    const deployments = await this.deploymentRepository.findByEnvironmentId(environmentId)
    const active = deployments.filter((d) =>
      ['queued', 'building', 'deploying'].includes(d.status)
    )

    await Promise.all(
      active.map(async (d) => {
        if (d.platformDeploymentId) {
          try {
            const provider = this.providerFactory.get(environment.platform)
            await provider.cancel(d.platformDeploymentId, environment)
          } catch {
            // best-effort cancel on the platform
          }
        }
        await this.deploymentRepository.complete(d.id, 'failed')
        await this.deploymentRepository.appendLog(d.id, {
          deploymentId: d.id,
          message: 'Cancelled by user',
          level: 'error',
          source: 'system',
          timestamp: new Date(),
        })
      })
    )

    await this.deploymentLock.release(environmentId)
    await this.environmentRepository.updateStatus(environmentId, 'failed')
  }

  async cancelDeployment(deploymentId: string, requestingUserId: string): Promise<void> {
    const deployment = await this.deploymentRepository.findById(deploymentId)
    if (!deployment) throw new DeploymentNotFoundError()

    const project = await this.projectRepository.findById(deployment.projectId)
    if (!project || project.ownerId !== requestingUserId) throw new DeploymentAccessDeniedError()

    if (!['queued', 'building', 'deploying'].includes(deployment.status)) {
      throw new AppError('Deployment cannot be cancelled in its current state', 409, 'CANNOT_CANCEL')
    }

    if (deployment.platformDeploymentId) {
      const environment = await this.environmentRepository.findById(deployment.environmentId)
      if (environment) {
        const provider = this.providerFactory.get(environment.platform)
        await provider.cancel(deployment.platformDeploymentId, environment)
      }
    }

    await this.deploymentRepository.complete(deploymentId, 'failed')
    await this.environmentRepository.updateStatus(deployment.environmentId, 'failed')
    await this.deploymentLock.release(deployment.environmentId)
  }

  async getLogs(deploymentId: string, requestingUserId: string): Promise<DeploymentLog[]> {
    const deployment = await this.deploymentRepository.findById(deploymentId)
    if (!deployment) throw new DeploymentNotFoundError()

    const project = await this.projectRepository.findById(deployment.projectId)
    if (!project || project.ownerId !== requestingUserId) throw new DeploymentAccessDeniedError()

    return this.deploymentRepository.getLogs(deploymentId)
  }

  async listByProject(projectId: string): Promise<Deployment[]> {
    return this.deploymentRepository.findByProjectId(projectId)
  }

  // Read model that mirrors how the webhook resolves a push: branch -> environment -> platform/service,
  // plus the latest deployment per environment as a mini run report. This is the "what deploys where"
  // view that GitHub Actions would otherwise express as in-repo workflow YAML.
  async getDeploymentSummary(
    projectId: string,
    requestingUserId: string
  ): Promise<DeploymentSummaryView> {
    const project = await this.projectRepository.findById(projectId)
    if (!project) throw new NotFoundError('Project')
    if (project.ownerId !== requestingUserId) throw new ForbiddenError()

    const environments = await this.environmentRepository.findByProjectId(projectId)
    const hasStaging = environments.some((e) => STAGING_PATTERN.test(e.name))

    // The webhook matches a pushed branch to a single environment (first match wins),
    // so flag any branch that is mapped to more than one environment.
    const branchCounts = environments.reduce<Record<string, number>>((acc, e) => {
      if (e.branch) acc[e.branch] = (acc[e.branch] ?? 0) + 1
      return acc
    }, {})

    const summaries = await Promise.all(
      environments.map<Promise<EnvironmentDeploymentSummary>>(async (e) => {
        const deployments = await this.deploymentRepository.findByEnvironmentId(e.id)
        const last = deployments[0] ?? null
        const isProduction = PRODUCTION_PATTERN.test(e.name)

        return {
          environmentId: e.id,
          name: e.name,
          branch: e.branch,
          platform: e.platform,
          platformServiceId: e.platformServiceId,
          status: e.status,
          autoDeploy: Boolean(e.branch),
          configured: Boolean(e.platformServiceId),
          isProduction,
          requiresStagingGate: isProduction && hasStaging,
          ambiguousBranch: Boolean(e.branch) && branchCounts[e.branch] > 1,
          lastDeployment: last
            ? {
                id: last.id,
                status: last.status,
                commitSha: last.commitSha,
                commitMessage: last.commitMessage,
                startedAt: last.startedAt,
                completedAt: last.completedAt,
                durationMs:
                  last.completedAt && last.startedAt
                    ? new Date(last.completedAt).getTime() - new Date(last.startedAt).getTime()
                    : null,
              }
            : null,
        }
      })
    )

    return {
      projectId: project.id,
      projectName: project.name,
      repoUrl: project.repoUrl,
      webhookUrl: `${env.APP_URL}/api/v1/webhooks/github`,
      environments: summaries,
    }
  }

  async listByUser(userId: string): Promise<Deployment[]> {
    const projects = await this.projectRepository.findByOwnerId(userId)
    if (projects.length === 0) return []
    const all = await Promise.all(
      projects.map((p) => this.deploymentRepository.findByProjectId(p.id))
    )
    return all.flat().sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getDeployment(deploymentId: string, requestingUserId: string): Promise<Deployment> {
    const deployment = await this.deploymentRepository.findById(deploymentId)
    if (!deployment) throw new DeploymentNotFoundError()

    const project = await this.projectRepository.findById(deployment.projectId)
    if (!project || project.ownerId !== requestingUserId) throw new DeploymentAccessDeniedError()

    return deployment
  }

  private async enqueueNotification(
    type: NotificationEventType,
    deployment: Deployment,
    environment: Environment,
    rollbackCommitSha?: string
  ): Promise<void> {
    try {
      const [user, project] = await Promise.all([
        this.authRepository.findbyId(deployment.triggeredBy),
        this.projectRepository.findById(deployment.projectId),
      ])

      if (!user?.email || !project) return

      const jobData: NotificationJobData = {
        type,
        userEmail: user.email,
        username: user.name,
        projectName: project.name,
        environmentName: environment.name,
        platform: environment.platform,
        deploymentId: deployment.id,
        commitSha: deployment.commitSha,
        commitMessage: deployment.commitMessage,
        rollbackCommitSha,
      }

      await this.notificationQueue.add(NotificationJobName.SEND_NOTIFICATION, jobData)
    } catch (err) {
      // Never let a notification failure affect deployment state
      logger.error({ err, deploymentId: deployment.id }, 'Failed to enqueue notification')
    }
  }

  private async log(
    deploymentId: string,
    message: string,
    level: 'info' | 'error' = 'info'
  ): Promise<void> {
    await this.deploymentRepository.appendLog(deploymentId, {
      deploymentId,
      message,
      level,
      source: 'system',
      timestamp: new Date(),
    })
  }
}
