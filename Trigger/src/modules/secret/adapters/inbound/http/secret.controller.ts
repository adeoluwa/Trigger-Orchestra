import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '@shared/guards/auth.guard'
import { SecretService } from '@modules/secret/application/services/secret.service'
import { StoreSecretSchema } from '@modules/secret/application/dtos'
import { ValidationError } from '@shared/errors'
import { successResponse, HttpStatus } from '@shared/http/ApiResponse'

export class SecretController {
  constructor(private readonly secretService: SecretService) {}

  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedRequest = StoreSecretSchema.safeParse(req.body)

      if (!parsedRequest.success)
        throw new ValidationError('Invalid input', parsedRequest.error.flatten().fieldErrors as any)

      const result = await this.secretService.storeSecret(
        parsedRequest.data,
        (req as AuthenticatedRequest).user.id
      )

      res.status(HttpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  }

  listForEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const secrets = await this.secretService.listForEnvironment(
        req.params.environmentId as string
      )

      res.status(HttpStatus.OK).json(successResponse(secrets))
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.query as { projectId: string }

      await this.secretService.deleteSecret(
        req.params.id as string,
        projectId,
        (req as AuthenticatedRequest).user.id
      )

      res.status(HttpStatus.NO_CONTENT).json(successResponse(null))
    } catch (error) {
      next(error)
    }
  }
}
