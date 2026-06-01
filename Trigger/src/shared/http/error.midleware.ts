import { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError } from '@shared/errors'
import { errorResponse, HttpStatus } from './ApiResponse'
import { logger } from '@infra/logger/logger'

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, path: req.path }, 'Non-operational error')
    }

    const fields = err instanceof ValidationError ? err.fields : undefined

    res.status(err.statusCode).json(errorResponse(err.code, err.message, fields))

    return
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error')

  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json(errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'))
}
