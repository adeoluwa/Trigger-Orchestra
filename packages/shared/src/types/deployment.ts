export type DeploymentStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled';

export type Platform = 'railway' | 'render';

export interface Deployment {
  id: string;
  projectId: string;
  environmentId: string;
  triggeredBy: string;
  platform: Platform;
  status: DeploymentStatus;
  commitSha: string;
  commitMessage: string;
  platformDeploymentId: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  source: 'system' | 'platform';
  timestamp: string;
}

export interface TriggerDeploymentRequest {
  projectId: string;
  environmentId: string;
}

export interface EnvironmentDeploymentSummary {
  environmentId: string;
  name: string;
  branch: string;
  platform: string;
  platformServiceId: string | null;
  status: 'idle' | 'deploying' | 'deployed' | 'failed';
  /** A branch is set, so a push to it auto-deploys this environment via the webhook. */
  autoDeploy: boolean;
  /** Platform service is linked, so the environment is actually deployable. */
  configured: boolean;
  isProduction: boolean;
  /** Production env that is gated behind a successful staging deploy. */
  requiresStagingGate: boolean;
  /** This branch is mapped to more than one environment — the webhook will only deploy the first match. */
  ambiguousBranch: boolean;
  lastDeployment: {
    id: string;
    status: DeploymentStatus;
    commitSha: string;
    commitMessage: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
  } | null;
}

export interface DeploymentSummary {
  projectId: string;
  projectName: string;
  repoUrl: string;
  /** Where GitHub push events are delivered for auto-deploys. */
  webhookUrl: string;
  environments: EnvironmentDeploymentSummary[];
}
