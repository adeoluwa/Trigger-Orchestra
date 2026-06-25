export enum QueueName {
  DEPLOYMENT = 'deployment',
  NOTIFICATION = 'notification',
}

export enum DeploymentJobName {
  PROCESS_DEPLOYMENT = 'process-deployment',
  CANCEL_DEPLOYMENT = 'cancel-deployment',
}

export enum NotificationJobName {
  SEND_NOTIFICATION = 'send-notification',
}

export type NotificationEventType =
  | 'deployment_success'
  | 'deployment_failed'
  | 'rollback_success'
  | 'rollback_failed'

export interface DeploymentJobData {
  deploymentId: string
  environmentId: string
  projectId: string
  platform: 'railway' | 'render'
}

export interface NotificationJobData {
  type: NotificationEventType
  userEmail: string
  username: string
  projectName: string
  environmentName: string
  platform: string
  deploymentId: string
  commitSha: string
  commitMessage: string
  rollbackCommitSha?: string
}
