import { Application } from 'express'
import { AppDataSource } from '@infra/database/typeorm.config'
import { deploymentQueue } from '@infra/queue/bullmq.config'
import { createAuthModule } from '@modules/auth/auth.module'
import { createProjectModule } from '@modules/project/project.module'
import { createDeploymentModule } from '@modules/deployment/deployment.module'
import { createSecretModule } from '@modules/secret/secret.module'

const API = '/api/v1'

export function registerRoutes(app: Application): void {
  const auth = createAuthModule(AppDataSource)
  const project = createProjectModule(AppDataSource)
  const deployment = createDeploymentModule(AppDataSource, deploymentQueue)
  const secret = createSecretModule(AppDataSource)

  app.use(`${API}/auth`, auth.router)
  app.use(`${API}/projects`, project.router)
  app.use(`${API}/deployments`, deployment.router)
  app.use(`${API}/secrets`, secret.router)
}
