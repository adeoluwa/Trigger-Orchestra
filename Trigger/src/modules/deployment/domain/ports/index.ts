import { Deployment, DeploymentLog } from '../entities/Deployment'
import { DeploymentStatus, Platform } from '@shared/types'
import { Environment } from '@modules/project/domain/entities/Project'

export interface DeploymentRepository {
  save(deployment: Omit<Deployment, 'createdAt' | 'updatedAt'>): Promise<Deployment>
  findById(id: string): Promise<Deployment | null>
  findByEnvironmentId(environmentId: string): Promise<Deployment[]>
  findByProjectId(projectId: string): Promise<Deployment[]>
  updateStatus(id: string, status: DeploymentStatus, platformDeploymentId?: string): Promise<void>
  complete(id: string, status: 'success' | 'failed'): Promise<void>
  appendLog(deploymentId: string, log: Omit<DeploymentLog, 'id'>): Promise<DeploymentLog>
  getLogs(deploymentId: string): Promise<DeploymentLog[]>
}

export interface DeploymentProviderPort {
  deploy(
    environment: Environment,
    commitSha: string,
    envVars: Record<string, string>
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
