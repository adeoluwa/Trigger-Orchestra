import { Router } from "express";
import { AuthController } from '@modules/auth/adapters/inbound/http/auth.controller';
import { authGuard } from '@shared/guards/auth.guard';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router()

  router.post('/register', controller.register)
  router.post('/login', controller.login)
  router.post('/refresh', controller.refreshToken)
  router.get('/me', authGuard, controller.me)
  router.get('/github', controller.githubRedirect)
  router.get('/github/callback', controller.githubCallback)
  router.get('/github/repos', authGuard, controller.githubRepos)
  router.post('/github/repos/:owner/:repo/config', authGuard, controller.createRepoConfig)

  return router
}