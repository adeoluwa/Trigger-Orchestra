import { DeploymentStatus, LogLevel, LogSource, Platform } from "@shared/types";

export interface Deployment {
  id: string
  environmentId: string
  projectId: string
  triggeredBy: string
  commitSha: string
  commitMessage: string
  status: DeploymentStatus
  platform: Platform
  platformDeploymentId: string | null
  startedAt: Date
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DeploymentLog {
  id: string
  deploymentId: string
  message: string
  level: LogLevel
  source: LogSource
  timestamp: Date
}