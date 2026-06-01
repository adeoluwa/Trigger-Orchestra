import { Router } from 'express'
import { DataSource } from 'typeorm'
import { SecretTypeOrmRepository } from './adapters/outbound/entities/SecretOrmRepository'
import { EnvironmentOrmRepository } from '@modules/project/adapters/outbound/repository/EnvironmentRepository'
import { ProjectOrmRepository } from '@modules/project/adapters/outbound/repository/ProjectRepository'
import { SecretService } from './application/services/secret.service'
import { SecretController } from './adapters/inbound/http/secret.controller'
import { createSecretRouter } from './adapters/inbound/http/secret.routes'

export function createSecretModule(dataSource: DataSource): { router: Router } {
  const secretRepository = new SecretTypeOrmRepository(dataSource)

  const environmentRepository = new EnvironmentOrmRepository(dataSource)

  const projectRepository = new ProjectOrmRepository(dataSource)

  const secretService = new SecretService(
    secretRepository,
    environmentRepository,
    projectRepository
  )

  const secretController = new SecretController(secretService)

  const router = createSecretRouter(secretController)

  return { router }
}
