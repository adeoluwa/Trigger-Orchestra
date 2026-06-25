import { AppError, NotFoundError, ForbiddenError } from "@shared/errors";

export class DeploymentNotFoundError extends NotFoundError {
  constructor() { super('Deployment') }
}

export class DeploymentAccessDeniedError extends ForbiddenError {
  constructor() { super('You do not have access to this deployment') }
}

export class DeploymentAlreadyRunningError extends AppError {
  constructor() {
    super('A deployment is already in progress for this environment', 409, 'DEPLOYMENT_ALREADY_RUNNING')
  }
}

export class PlatformNotSupportedError extends AppError {
  constructor(platform: string) {
    super(`Platform "${platform}" is not supported`, 422, 'PLATFORM_NOT_SUPPORTED')
  }
}

export class StagingGateError extends AppError {
  constructor() {
    super(
      'Production deployments require a passing staging deployment. Deploy to staging first.',
      409,
      'STAGING_GATE_FAILED'
    )
  }
}