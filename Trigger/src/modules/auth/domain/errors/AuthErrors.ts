import { ConflictError, UnauthorizedError, AppError } from '@shared/errors'

export class EmailAlreadyExistError extends ConflictError {
  constructor() {
    super('An account with this email already exists')
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password')
  }
}

export class AccountNotVerifiedError extends AppError {
  constructor() {
    super('Please verify your email before logging in', 403, 'ACCOUNT_NOT_VERIFIED')
  }
}
