import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '@shared/errors'
import { verifyAccessToken } from '@utils/jwt'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
  }
}

export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed authorization header')
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    ;(req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
    }

    next()
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired access token'))
  }
}
