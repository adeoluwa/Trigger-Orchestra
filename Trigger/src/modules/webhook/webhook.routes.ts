import { Router } from 'express'
import { WebhookController } from './webhook.controller'

export function createWebhookRouter(controller: WebhookController): Router {
  const router = Router()
  router.post('/github', controller.handleGithubPush)
  return router
}
