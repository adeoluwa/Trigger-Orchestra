import { Platform, EnvironmentStatus, DockerConfig, RateLimitConfig } from "@shared/types";

export interface Project {
  id: string
  name: string;
  ownerId: string;
  repoUrl: string;
  repoProvider: string;
  configPath: string;
  environments: Environment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  platform: Platform;
  branch: string;
  docker: DockerConfig | null;
  featureFlags: Record<string, boolean>;
  rateLimit: RateLimitConfig | null;
  status: EnvironmentStatus;
  platformServiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}