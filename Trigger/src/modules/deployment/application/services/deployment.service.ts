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
import { DeploymentJobData, DeploymentJobName } from '@shared/queue/QueueNames'
import {
  DeploymentNotFoundError,
  DeploymentAccessDeniedError,
  DeploymentAlreadyRunningError,
} from '@modules/deployment/domain/errors/DeploymentErrors'
import { NotFoundError, ForbiddenError, AppError } from '@shared/errors'
import { TriggerDeploymentDto } from '../dto'
import { logger } from '@infra/logger/logger'

export class DeploymentService {
  constructor(
    private readonly deploymentRepository: DeploymentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly authRepository: AuthRepository,
    private readonly repositoryProvider: RepositoryProviderPort,
    private readonly providerFactory: DeploymentProviderFactory,
    private readonly secretRepository: SecretRepository,
    private readonly deploymentQueue: Queue
  ) {}

  async triggerDeployment(dto: TriggerDeploymentDto, triggeredBy: string): Promise<Deployment> {
    const environment = await this.environmentRepository.findById(dto.environmentId)

    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(dto.environmentId)

    if (!project) throw new NotFoundError('Project')

    if (project.ownerId !== triggeredBy) throw new ForbiddenError()

    if (environment.status === 'deploying') throw new DeploymentAlreadyRunningError()

    const user = await this.authRepository.findbyId(triggeredBy)

    if (!user || !user.githubToken) throw new NotFoundError('User Github token')

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

      return
    }

    const environment = await this.environmentRepository.findById(environmentId)

    if (!environment) {
      await this.deploymentRepository.complete(deployment.id, 'failed')

      return
    }

    await this.deploymentRepository.updateStatus(deploymentId, 'building')

   await this.log(deploymentId, `Starting deployment to ${environment.platform}`)
    await this.log(deploymentId, `Commit: ${deployment.commitSha.slice(0, 7)} — ${deployment.commitMessage}`)

    try {
      const secrets = await this.secretRepository.resolveForEnvironment(environmentId)

      const provider = this.providerFactory.get(environment.platform)

      await this.deploymentRepository.updateStatus(deploymentId, 'deploying')

      await this.log(deploymentId, `Calling ${environment.platform} API...`)

      const platformDeploymentId = await provider.deploy(environment, deployment.commitSha, secrets)

      await this.deploymentRepository.updateStatus(deploymentId, 'deploying', platformDeploymentId)

      this.log( deploymentId , `Platform deployment ID: ${platformDeploymentId}`)

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

      await this.environmentRepository.updateStatus(
        environmentId,
        succeeded ? 'deployed' : 'failed'
      )

      logger.info({ deploymentId }, `Deployment ${finalStatus}`, succeeded ? 'info' : 'error')
    } catch (error) {
      const exception = error as Error

      await this.deploymentRepository.complete(deploymentId, 'failed')

      await this.environmentRepository.updateStatus(environmentId, 'failed')

      await this.log( deploymentId , `Deployment failed: ${exception.message}`, 'error')
    }
  }

  async cancelDeployment(deploymentId: string, requestingUserId: string): Promise<void> {
    const deployment = await this.deploymentRepository.findById(deploymentId)

    if (!deployment) throw new DeploymentNotFoundError()

    const project = await this.projectRepository.findById(deployment.projectId)

    if (!project || project.ownerId !== requestingUserId) throw new DeploymentAccessDeniedError()

    if (!['queued', 'building', 'deploying'].includes(deployment.status)) {
      throw new AppError(
        'Deployment cannot be cancelled in its curency state',
        409,
        'CANNOT_CANCEL'
      )
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

  async getDeployment(deploymentId: string, requestingUserId: string): Promise<Deployment> {
    const deployment = await this.deploymentRepository.findById(deploymentId)

    if (!deployment) throw new DeploymentNotFoundError()

    const project = await this.projectRepository.findById(deployment.projectId)

    if (!project || project.ownerId !== requestingUserId) throw new DeploymentAccessDeniedError()

    return deployment
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
