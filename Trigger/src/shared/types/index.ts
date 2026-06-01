export type Platform = 'railway' | 'render' | 'local'

export type DeploymentStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'

export type EnvironmentStatus = 'idle' | 'deploying' | 'deployed' | 'failed'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export type LogSource = 'platform' | 'system'

export interface DockerConfig {
  enabled: boolean
  dockerfilePath: string
  composePath: string | null
  buildArgs: Record<string, string>
}

export interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit: number | null
}

export interface ParsedEnvironmentConfig {
  branch: string
  platform: Platform
  docker?: Partial<DockerConfig>
  featureFlags?: Record<string, boolean>
  rateLimit?: Partial<RateLimitConfig>
  env?: Record<string, string>
}

export interface ParsedConfig {
  project: string
  repo: string
  docker?: Partial<DockerConfig>
  environments: Record<string, ParsedEnvironmentConfig>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
