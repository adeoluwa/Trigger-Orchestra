import { Deployment, DeploymentLog } from '../entities/Deployment'
import { DeploymentStatus, Platform } from '@shared/types'
import { Environment } from '@modules/project/domain/entities/Project'

export interface DeploymentRepository {
  save(deployment: Omit<Deployment, 'createdAt' | 'updatedAt'>): Promise<Deployment>
  findById(id: string): Promise<Deployment | null>
  findByEnvironmentId(environmentId: string): Promise<Deployment[]>
  findByProjectId(projectId: string): Promise<Deployment[]>
  findLastSuccessful(environmentId: string): Promise<Deployment | null>
  updateStatus(id: string, status: DeploymentStatus, platformDeploymentId?: string): Promise<void>
  complete(id: string, status: 'success' | 'failed'): Promise<void>
  appendLog(deploymentId: string, log: Omit<DeploymentLog, 'id'>): Promise<DeploymentLog>
  getLogs(deploymentId: string): Promise<DeploymentLog[]>
  findInProgress(): Promise<Deployment[]>
}

export interface CreateServiceParams {
  name: string
  repoUrl: string
  branch: string
  platformAccountId: string
  buildCommand?: string
  startCommand?: string
}

export interface DeploymentProviderPort {
  createService(params: CreateServiceParams): Promise<string>
  deploy(
    environment: Environment,
    commitSha: string,
    envVars: Record<string, string>
  ): Promise<string>
  rollback(
    lastPlatformDeploymentId: string,
    lastCommitSha: string,
    environment: Environment
  ): Promise<string>
  getStatus(platformDeploymentId: string, environment: Environment): Promise<DeploymentStatus>
  streamLogs(
    platformDeploymentId: string,
    environment: Environment,
    onLog: (message: string, level: 'info' | 'error') => void
  ): Promise<void>
  cancel(platformDeploymentId: string, environment: Environment): Promise<void>
}

export interface DeploymentProviderFactory {
  get(platform: Platform): DeploymentProviderPort
}
