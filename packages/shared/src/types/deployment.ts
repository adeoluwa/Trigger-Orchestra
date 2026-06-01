export type DeploymentStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

export type DeploymentProvider = 'railway' | 'render';

export interface Deployment {
  id: string;
  projectId: string;
  environmentId?: string;
  provider: DeploymentProvider;
  status: DeploymentStatus;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  providerDeploymentId?: string;
  providerDeploymentUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  createdAt: string;
}

export interface TriggerDeploymentRequest {
  projectId: string;
  environmentId?: string;
  provider: DeploymentProvider;
  branch?: string;
}
