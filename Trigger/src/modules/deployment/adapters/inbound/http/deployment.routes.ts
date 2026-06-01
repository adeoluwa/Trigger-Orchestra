import { Router } from 'express'
import { DeploymentController } from './deployment.controller'
import { authGuard } from '@shared/guards/auth.guard'

export function createDeploymentRouter(controller: DeploymentController): Router {
  const router = Router()

  router.use(authGuard)

  router.post('/trigger', controller.trigger)
  router.post('/:id/cancel', controller.cancel)
  router.get('/:id/logs', controller.getLogs)
  router.get('/:id/logs/stream', controller.streamLogs)
  router.get('/project/:projectId', controller.listByProject)

  return router
}
