export enum QueueName {
  DEPLOYMENT = 'deployment',
  NOTIFICATION = 'notification',
}

export enum DeploymentJobName {
  PROCESS_DEPLOYMENT = 'process-deployment',
  CANCEL_DEPLOYMENT = 'cancel-deployment',
}

export interface DeploymentJobData {
  deploymentId: string
  environmentId: string
  projectId: string
  platform: 'railway' | 'render'
}
