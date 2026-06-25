import { ProjectRepository, EnvironmentRepository, RepositoryProviderPort, ConfigParsePort } from '@modules/project/domain/ports';
import { DeploymentProviderFactory } from '@modules/deployment/domain/ports';
import { AuthRepository } from '@modules/auth/domain/ports';
import { CreateProjectDto, ParseConfigDto, UpdateProjectDto } from '../dto';
import { Project, Environment } from '@modules/project/domain/entities/Project';
import { ParsedConfig, ValidationResult } from '@shared/types';
import { ProjectNotFoundError, ProjectAccessDeniedError, InvalidConfigError, RepoAccessError } from '@modules/project/domain/errors/ProjectErrors';
import { NotFoundError } from '@shared/errors';
import { env } from  '@config/env';
import { logger } from '@infra/logger/logger';

export interface CreateProjectResult {
  project: Project;
  environments: Environment[];
  parsedConfig: ParsedConfig;
}

export interface ParseConfigResult {
  config: ParsedConfig
  validation: ValidationResult
}

export class ProjectService {
  constructor (
    private readonly projectRepository: ProjectRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly repositoryProvider: RepositoryProviderPort,
    private readonly configParser: ConfigParsePort,
    private readonly authRepository: AuthRepository,
    private readonly providerFactory: DeploymentProviderFactory,
  ) {}

  async createProject(dto: CreateProjectDto, ownerId: string): Promise<CreateProjectResult> {
    const user = await this.authRepository.findbyId(ownerId);

    if (!user) throw new NotFoundError('User');

    if (!user.githubToken) throw new RepoAccessError();

    const isRepositoryAccessible = await this.repositoryProvider.validateRepo(dto.repoUrl, user.githubToken);

    if (!isRepositoryAccessible) throw new RepoAccessError();

    let rawConfig: string
    try {
      rawConfig = await this.repositoryProvider.getFileContent(
        dto.repoUrl, dto.configPath, 'main', user.githubToken
      )
    } catch {
      throw new InvalidConfigError('Could not read ${dto.configPath} from repository')
    }

    const parsedConfig = await this.configParser.parse(rawConfig);
    const validation = await this.configParser.validate(parsedConfig);

    if (!validation.valid) throw new InvalidConfigError(validation.errors.join('; '));
    
    const projectData = {
      name: dto.name,
      ownerId,
      repoUrl: dto.repoUrl,
      repoProvider: 'github' as const,
      configPath: dto.configPath,
      updatedAt: new Date()
    }

    const environmentData = Object.entries(parsedConfig.environments).map(([name, envConfig]) => ({
      name,
      platform: envConfig.platform,
      branch: envConfig.branch,
      docker: envConfig.docker
        ? {
          enabled: envConfig.docker.enabled ?? false,
          dockerfilePath: envConfig.docker.dockerfilePath ?? './Dockerfile',
          composePath: envConfig.docker.composePath ?? null,
          buildArgs: envConfig.docker.buildArgs ?? {},
        }
        : null,
      featureFlags: envConfig.featureFlags ?? {},
      rateLimit: envConfig.rateLimit
        ? {
          requestsPerMinute: envConfig.rateLimit.requestsPerMinute ?? 100,
          burstLimit: envConfig.rateLimit.burstLimit ?? null,
        }
        : null,
      status: 'idle' as const,
      platformServiceId: null
    }))

    const { project, environments } = await this.projectRepository.saveWithEnvironments(projectData, environmentData)

    try {
      await this.repositoryProvider.setupWebhook(
        dto.repoUrl,
        `${env.APP_URL}/api/v1/webhooks/github`,
        env.GITHUB_WEBHOOK_SECRET,
        user.githubToken
      )
    } catch (err) {
      // non fatal
      logger.error(`Failed to set up webhook for project ${project.id}: ${err instanceof Error ? err.message : String(err)}`)
    }

    return { project: { ...project,environments }, environments, parsedConfig }
  }

  async listProjects(ownerId: string): Promise<Project[]> {
    return this.projectRepository.findByOwnerId(ownerId)
  };

  async getProject(projectId: string, requestingUserId: string): Promise<Project>{
    const project = await this.projectRepository.findByIdWithEnvironments(projectId);

    if (!project) throw new ProjectNotFoundError();

    if (project.ownerId !== requestingUserId) throw new ProjectAccessDeniedError();

    return project;

  }

  async updateProject(projectId: string, requestingUserId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) throw new ProjectNotFoundError();

    if (project.ownerId !== requestingUserId) throw new ProjectAccessDeniedError();

    return this.projectRepository.update(projectId, dto);
  }

  async updateEnvironment(
    environmentId: string,
    requestingUserId: string,
    data: { platformServiceId?: string | null; branch?: string }
  ): Promise<Environment> {
    const environment = await this.environmentRepository.findById(environmentId)
    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)
    if (!project) throw new ProjectNotFoundError()
    if (project.ownerId !== requestingUserId) throw new ProjectAccessDeniedError()

    return this.environmentRepository.update(environmentId, data)
  }

  async provisionEnvironment(
    environmentId: string,
    requestingUserId: string,
    params: { name: string; platformAccountId: string; buildCommand?: string; startCommand?: string }
  ): Promise<Environment> {
    const environment = await this.environmentRepository.findById(environmentId)
    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)
    if (!project) throw new ProjectNotFoundError()
    if (project.ownerId !== requestingUserId) throw new ProjectAccessDeniedError()

    const provider = this.providerFactory.get(environment.platform)
    const serviceId = await provider.createService({
      name: params.name,
      repoUrl: project.repoUrl,
      branch: environment.branch,
      platformAccountId: params.platformAccountId,
      buildCommand: params.buildCommand,
      startCommand: params.startCommand,
    })

    return this.environmentRepository.update(environmentId, { platformServiceId: serviceId })
  }

  async deleteProject(projectId: string, requestingUserId: string): Promise<void>{
    const project = await this.projectRepository.findById(projectId);

    if (!project) throw new ProjectNotFoundError();

    if (project.ownerId !== requestingUserId) throw new ProjectAccessDeniedError();

    await this.projectRepository.delete(projectId)
  }

  async parseConfigPreview(dto: ParseConfigDto): Promise<ParseConfigResult> {
    let config: ParsedConfig;

    try {
      config = await this.configParser.parse(dto.rawYaml)
    } catch (error) {
      throw new InvalidConfigError(`YAML parse error: ${error instanceof Error ? error.message : String(error)}`);
    }

    const validation = await this.configParser.validate(config);

    return { config, validation}
  }
}