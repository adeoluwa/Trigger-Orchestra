import { Job } from 'bullmq'
import { AppDataSource } from '@infra/database/typeorm.config'
import { createWorker, deploymentQueue, notificationQueue } from '@infra/queue/bullmq.config'
import { QueueName, DeploymentJobData, DeploymentJobName } from '@shared/queue/QueueNames'
import { DeploymentService } from '@modules/deployment/application/services/deployment.service'
import { DeploymentTypeOrmRepository } from '@modules/deployment/adapters/outbound/repository/DeploymentRepository'
import { ProjectOrmRepository } from '@modules/project/adapters/outbound/repository/ProjectRepository'
import { EnvironmentOrmRepository } from '@modules/project/adapters/outbound/repository/EnvironmentRepository'
import { UserRepository } from '@modules/auth/adapters/outbound/entities/UserRepository'
import { GitHubRepositoryProvider } from '@modules/project/adapters/outbound/github/GitHubRepositoryProvider'
import { DeploymentProviderFactoryImpl } from '@modules/deployment/adapters/outbound/DeploymentProviderFactoryImpl'
import { SecretTypeOrmRepository } from '@modules/secret/adapters/outbound/entities/SecretOrmRepository'
import { DeploymentLock } from '@infra/lock/DeploymentLock'
import { getRedis } from '@infra/cache/redis.config'
import { logger } from '@infra/logger/logger'

export function startDeploymentWorker(): void {
  const deploymentRepository = new DeploymentTypeOrmRepository(AppDataSource)
  const environmentRepository = new EnvironmentOrmRepository(AppDataSource)
  const projectRepository = new ProjectOrmRepository(AppDataSource)
  const authRepository = new UserRepository(AppDataSource)
  const repositoryProvider = new GitHubRepositoryProvider()
  const providerFactory = new DeploymentProviderFactoryImpl()
  const secretRepository = new SecretTypeOrmRepository(AppDataSource)
  const deploymentLock = new DeploymentLock(getRedis())

  const deploymentService = new DeploymentService(
    deploymentRepository,
    environmentRepository,
    projectRepository,
    authRepository,
    repositoryProvider,
    providerFactory,
    secretRepository,
    deploymentQueue,
    deploymentLock,
    notificationQueue
  )

  // Mark any deployments that were in-flight during the last crash as failed
  deploymentService.reconcileStaleDeployments().catch((err) =>
    logger.error({ err }, 'Failed to reconcile stale deployments on startup')
  )

  createWorker<DeploymentJobData>(
    QueueName.DEPLOYMENT,
    async (job: Job<DeploymentJobData>) => {
      if (job.name === DeploymentJobName.PROCESS_DEPLOYMENT) {
        logger.info({ jobId: job.id, data: job.data }, 'Processing deployment job')
        await deploymentService.processDeployment(job.data)
      }
    },
    3
  )

  logger.info('Deployment worker started')
}
