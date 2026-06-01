import { Router } from 'express'
import { DataSource } from 'typeorm'
import { UserRepository } from '@modules/auth/adapters/outbound/entities/UserRepository'
import { AuthController } from '@modules/auth/adapters/inbound/http/auth.controller'
import { createAuthRouter } from '@modules/auth/adapters/inbound/http/auth.routes'
import { JwtTokenService } from './adapters/outbound/jwt/JwtTokenService'
import { GitHubOAuthService } from './adapters/outbound/oauth/GitHubOAuthService'
import { AuthService } from './application/services/auth.service'

export function createAuthModule(dataSource: DataSource): { router: Router } {
  const authRepository = new UserRepository(dataSource)
  const tokenService = new JwtTokenService()
  const githubOAuth = new GitHubOAuthService()
  const authservice = new AuthService(authRepository, tokenService, githubOAuth)
  const controller = new AuthController(authservice)
  const router = createAuthRouter(controller)

  return { router }
}
