import { Response, NextFunction, Request } from 'express'
import { AuthenticatedRequest } from '@shared/guards/auth.guard'
import { DeploymentService } from '@modules/deployment/application/services/deployment.service'
import { TriggerDeploymentSchema } from '@modules/deployment/application/dto'
import { ValidationError } from '@shared/errors'
import { successResponse, HttpStatus } from '@shared/http/ApiResponse'

export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  trigger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedRequest = TriggerDeploymentSchema.safeParse((req as AuthenticatedRequest).body)

      if (!parsedRequest.success)
        throw new ValidationError('Invalid input', parsedRequest.error.flatten().fieldErrors as any)

      const deployment = await this.deploymentService.triggerDeployment(
        parsedRequest.data,
        (req as AuthenticatedRequest).user.id
      )

      res.status(HttpStatus.ACCEPTED).json(successResponse(deployment))
    } catch (error) {
      next(error)
    }
  }

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deploymentService.cancelDeployment(
        req.params.id as string,
        (req as AuthenticatedRequest).user.id
      )

      res.status(HttpStatus.OK).json(successResponse({ cancelled: true }))
    } catch (error) {
      next(error)
    }
  }

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await this.deploymentService.getLogs(
        req.params.id as string,
        (req as AuthenticatedRequest).user.id
      )

      res.status(HttpStatus.OK).json(successResponse(logs))
    } catch (error) {
      next(error)
    }
  }

  streamLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deploymentService.getDeployment(
        req.params.id as string,
        (req as AuthenticatedRequest).user.id
      )

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()

      const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

      const existingLogs = await this.deploymentService.getLogs(
        req.params.id as string,
        (req as AuthenticatedRequest).user.id
      )

      existingLogs.forEach((log) => send(log))

      const activeStatuses = ['queued', 'building', 'deploying']

      let lastLogCount = existingLogs.length

      const interval = setInterval(async () => {
        try {
          const current = await this.deploymentService.getDeployment(
            req.params.id as string,
            (req as AuthenticatedRequest).user.id
          )

          const allLogs = await this.deploymentService.getLogs(
            req.params.id as string,
            (req as AuthenticatedRequest).user.id
          )

          allLogs.slice(lastLogCount).forEach((log) => send(log))
          lastLogCount = allLogs.length

          if (!activeStatuses.includes(current.status)) {
            send({ type: 'done', status: current.status })
            clearInterval(interval)
            res.end()
          }
        } catch (error) {
          clearInterval(interval)
          res.end()
        }
      }, 2000)

      req.on('close', () => {
        clearInterval(interval)
        res.end()
      })
    } catch (error) {
      next(error)
    }
  }

  listByProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deployments = await this.deploymentService.listByProject(req.params.projectId as string)
    } catch (error) {
      next(error)
    }
  }
}
