import { Project, Environment } from '../entities/Project'
import { ParsedConfig, ValidationResult } from '@shared/types'

export interface ProjectRepository {
  save(project: Omit<Project, 'id' | 'createdAt' | 'updateAt' | 'environments'>): Promise<Project>
  saveWithEnvironments(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'environments'>,
    environments: Omit<Environment, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ project: Project; environments: Environment[] }>
  findById(id: string): Promise<Project | null>
  findByIdWithEnvironments(id: string): Promise<Project | null>
  findByRepoUrl(repoUrl: string): Promise<Project | null>
  findByOwnerId(ownerId: string): Promise<Project[]>
  update(id: string, data: Partial<Project>): Promise<Project>
  delete(id: string): Promise<void>
}

export interface EnvironmentRepository {
  saveMany(data: Omit<Environment, 'createdAt' | 'updatedAt'>[]): Promise<Environment[]>
  findByProjectId(projectId: string): Promise<Environment[]>
  findById(id: string): Promise<Environment | null>
  update(id: string, data: Partial<Environment>): Promise<Environment>
  updateStatus(id: string, status: Environment['status']): Promise<void>
  deleteByProjectId(projectId: string): Promise<void>
}

export interface RepositoryProviderPort {
  validateRepo(repoUrl: string, token: string): Promise<boolean>
  getLatestCommit(repoUrl: string, branch: string, token: string): Promise<{ sha: string; message: string }>
  getFileContent(repoUrl: string, filePath: string, branch: string, token: string): Promise<string>
  setupWebhook(repoUrl: string, webhookUrl: string, secret: string, token: string): Promise<string>
}

export interface ConfigParsePort {
  parse(rawContent: string): Promise<ParsedConfig>
  validate(config: ParsedConfig): Promise<ValidationResult>
}