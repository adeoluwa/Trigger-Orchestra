import { Router } from 'express'
import { DataSource } from 'typeorm'
import { ProjectOrmRepository } from './adapters/outbound/repository/ProjectRepository'
import { EnvironmentOrmRepository } from './adapters/outbound/repository/EnvironmentRepository'
import { GitHubRepositoryProvider } from './adapters/outbound/github/GitHubRepositoryProvider'
import { YamlConfigParser } from './adapters/outbound/config/YamlConfigParser'
import { UserRepository } from '@modules/auth/adapters/outbound/entities/UserRepository'
import { DeploymentProviderFactoryImpl } from '@modules/deployment/adapters/outbound/DeploymentProviderFactoryImpl'
import { ProjectService } from './application/services/project.service'
import { ProjectController } from './adapters/inbound/http/project.controller'
import { createProjectRouter } from './adapters/inbound/http/project.routes'

export function createProjectModule(dataSource: DataSource): { router: Router } {
  const projectRepository = new ProjectOrmRepository(dataSource)
  const environmentRepository = new EnvironmentOrmRepository(dataSource)
  const repositoryProvider = new GitHubRepositoryProvider()
  const configParser = new YamlConfigParser()
  const authRepository = new UserRepository(dataSource)
  const providerFactory = new DeploymentProviderFactoryImpl()
  const projectService = new ProjectService(
    projectRepository,
    environmentRepository,
    repositoryProvider,
    configParser,
    authRepository,
    providerFactory,
  )
  const controller = new ProjectController(projectService)
  const router = createProjectRouter(controller)
  return { router }
}
