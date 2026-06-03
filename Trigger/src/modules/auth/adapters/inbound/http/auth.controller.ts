import { Request, Response, NextFunction } from 'express'
import { AuthService } from '@modules/auth/application/services/auth.service'
import { RegisterUserSchema, LoginUserSchema, RefreshTokenSchema } from '@modules/auth/application/dtos'
import { ValidationError } from '@shared/errors'
import { HttpStatus, successResponse } from '@shared/http/ApiResponse'
import { AuthenticatedRequest } from '@shared/guards/auth.guard'
import { env } from '@config/env'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedRequest = RegisterUserSchema.safeParse(req.body)
  
      if (!parsedRequest.success) throw new ValidationError("Invalid input");

      const result = await this.authService.register(parsedRequest.data);

      res.status(HttpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  }

  login = async (req:Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedRequest = LoginUserSchema.safeParse(req.body)

      if (!parsedRequest.success) throw new ValidationError("Invalid input");

      const result = await this.authService.login(parsedRequest.data);

      res.status(HttpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedRequest = RefreshTokenSchema.safeParse(req.body);

      if (!parsedRequest.success) throw new ValidationError('Invalid input', parsedRequest.error.flatten().fieldErrors as any);

      const result = await this.authService.refresh(parsedRequest.data);

      res.status(HttpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  }

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).user
      const profile = await this.authService.getProfile(id)
      res.status(HttpStatus.OK).json(successResponse(profile))
    } catch (error) {
      next(error)
    }
  }

  githubRepos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).user
      const repos = await this.authService.getGithubRepos(id)
      res.status(HttpStatus.OK).json(successResponse(repos))
    } catch (error) {
      next(error)
    }
  }

  githubRedirect = (_req: Request, res: Response): void => {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'user:email repo',
    })

    res.redirect(`https://github.com/login/oauth/authorize?${params}`)
  }

  githubCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.query.code as string | undefined

      if (!code) throw new ValidationError('Missing OAuth code')

      const result = await this.authService.githubLogin(code)

      const frontendUrl = new URL('/auth/callback', env.FRONTEND_URL)
      frontendUrl.searchParams.set('token', result.accessToken)
      frontendUrl.searchParams.set('refreshToken', result.refreshToken)

      res.redirect(frontendUrl.toString())
    } catch (error) {
      next(error)
    }
  }
}