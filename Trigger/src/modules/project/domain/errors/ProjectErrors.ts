import { AppError, NotFoundError, ForbiddenError } from '@shared/errors'

export class ProjectNotFoundError extends NotFoundError {
  constructor() {
    super('Project')
  }
}

export class EnvironmentNotFoundError extends NotFoundError {
  constructor() {
    super('Environment')
  }
}

export class ProjectAccessDeniedError extends ForbiddenError {
  constructor() {
    super('You do not have access to this project')
  }
}

export class InvalidConfigError extends AppError {
  constructor(details: string) {
    super(`Invalid configuration: ${details}`, 422, 'INVALID_CONFIG')
  }
}

export class RepoAccessError extends AppError {
  constructor() {
    super(
      'Could not access repository. Check the URL and your GitHub token.',
      422,
      'REPO_ACCESS_ERROR'
    )
  }
}
