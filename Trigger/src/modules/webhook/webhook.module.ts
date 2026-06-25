import { Router } from 'express'
import { DataSource } from 'typeorm'
import { Queue } from 'bullmq'
import { ProjectOrmRepository } from '@modules/project/adapters/outbound/repository/ProjectRepository'
import { EnvironmentOrmRepository } from '@modules/project/adapters/outbound/repository/EnvironmentRepository'
import { DeploymentTypeOrmRepository } from '@modules/deployment/adapters/outbound/repository/DeploymentRepository'
import { UserRepository } from '@modules/auth/adapters/outbound/entities/UserRepository'
import { GitHubRepositoryProvider } from '@modules/project/adapters/outbound/github/GitHubRepositoryProvider'
import { DeploymentProviderFactoryImpl } from '@modules/deployment/adapters/outbound/DeploymentProviderFactoryImpl'
import { SecretTypeOrmRepository } from '@modules/secret/adapters/outbound/entities/SecretOrmRepository'
import { DeploymentLock } from '@infra/lock/DeploymentLock'
import { getRedis } from '@infra/cache/redis.config'
import { DeploymentService } from '@modules/deployment/application/services/deployment.service'
import { WebhookController } from './webhook.controller'
import { createWebhookRouter } from './webhook.routes'

export function createWebhookModule(
  dataSource: DataSource,
  deploymentQueue: Queue,
  notificationQueue: Queue
): { router: Router } {
  const projectRepository = new ProjectOrmRepository(dataSource)
  const environmentRepository = new EnvironmentOrmRepository(dataSource)
  const deploymentRepository = new DeploymentTypeOrmRepository(dataSource)
  const authRepository = new UserRepository(dataSource)
  const repositoryProvider = new GitHubRepositoryProvider()
  const providerFactory = new DeploymentProviderFactoryImpl()
  const secretRepository = new SecretTypeOrmRepository(dataSource)
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

  const controller = new WebhookController(projectRepository, deploymentService)
  const router = createWebhookRouter(controller)

  return { router }
}
