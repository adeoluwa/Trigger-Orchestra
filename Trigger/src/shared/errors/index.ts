export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code: string

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code

    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'unauthorized'){
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'bad request') {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 422, 'VALIDATION_ERROR')
    this.fields = fields
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR')
  }
}