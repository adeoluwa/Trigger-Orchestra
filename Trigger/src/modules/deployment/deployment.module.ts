import { Router } from 'express'
import { DataSource } from 'typeorm'
import { Queue } from 'bullmq'
import { DeploymentTypeOrmRepository } from './adapters/outbound/repository/DeploymentRepository'
import { EnvironmentOrmRepository } from '@modules/project/adapters/outbound/repository/EnvironmentRepository'
import { ProjectOrmRepository } from '@modules/project/adapters/outbound/repository/ProjectRepository'
import { UserRepository } from '@modules/auth/adapters/outbound/entities/UserRepository'
import { GitHubRepositoryProvider } from '@modules/project/adapters/outbound/github/GitHubRepositoryProvider'
import { DeploymentProviderFactoryImpl } from './adapters/outbound/DeploymentProviderFactoryImpl'
import { SecretTypeOrmRepository } from '@modules/secret/adapters/outbound/entities/SecretOrmRepository'
import { DeploymentService } from './application/services/deployment.service'
import { DeploymentController } from './adapters/inbound/http/deployment.controller'
import { createDeploymentRouter } from './adapters/inbound/http/deployment.routes'

export function createDeploymentModule(
  dataSource: DataSource,
  deploymentQueue: Queue
): { router: Router } {
  const deploymentRepository = new DeploymentTypeOrmRepository(dataSource)
  const environmentRepository = new EnvironmentOrmRepository(dataSource)
  const projectRepository = new ProjectOrmRepository(dataSource)
  const authRepository = new UserRepository(dataSource)
  const repositoryProvider = new GitHubRepositoryProvider()
  const providerFactory = new DeploymentProviderFactoryImpl()
  const secretRepository = new SecretTypeOrmRepository(dataSource)

  const deploymentService = new DeploymentService(
    deploymentRepository,
    environmentRepository,
    projectRepository,
    authRepository,
    repositoryProvider,
    providerFactory,
    secretRepository,
    deploymentQueue
  )

  const controller = new DeploymentController(deploymentService)
  const router = createDeploymentRouter(controller)

  return { router }
}
