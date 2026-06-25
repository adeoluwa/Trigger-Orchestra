import { Router } from 'express'
import { SecretController } from './secret.controller'
import { authGuard } from '@shared/guards/auth.guard'

export function createSecretRouter(controller: SecretController): Router {
  const router = Router()

  router.use(authGuard)

  router.post('/', controller.store)
  router.get('/environment/:environmentId', controller.listForEnvironment)
  router.get('/:id/reveal', controller.reveal)
  router.delete('/:id', controller.delete)

  return router
}
