import { SecretRepository } from '@modules/secret/domain/ports'
import { EnvironmentRepository } from '@modules/project/domain/ports'
import { ProjectRepository } from '@modules/project/domain/ports'
import { Secret } from '@modules/secret/domain/entities/Secret'
import { NotFoundError, ForbiddenError } from '@shared/errors'
import { StoreSecretDto } from '../dtos'
import { encrypt, decrypt } from '@utils/crypto'

export class SecretService {
  constructor(
    private readonly secretRepository: SecretRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly projectRepository: ProjectRepository
  ) {}

  async storeSecret(
    dto: StoreSecretDto,
    requestingUserId: string
  ): Promise<{ id: string; key: string }> {
    const environment = await this.environmentRepository.findById(dto.environmentId)

    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)

    if (!project) throw new NotFoundError('Project')

    if (project.ownerId !== requestingUserId) throw new ForbiddenError()

    const encryptedValue = encrypt(dto.value)

    const secret = await this.secretRepository.upsert(dto.environmentId, dto.key, encryptedValue)

    return { id: secret.id, key: secret.key }
  }

  async listForEnvironment(environmentId: string): Promise<Omit<Secret, 'encryptedValue'>[]> {
    const secrets = await this.secretRepository.findByEnvironmentId(environmentId)

    return secrets.map(({ id, key, environmentId, createdAt, updatedAt }) => ({
      id,
      key,
      environmentId,
      createdAt,
      updatedAt,
    }))
  }

  async revealSecret(secretId: string, requestingUserId: string): Promise<string> {
    const secret = await this.secretRepository.findById(secretId)

    if (!secret) throw new NotFoundError('Secret')

    const environment = await this.environmentRepository.findById(secret.environmentId)

    if (!environment) throw new NotFoundError('Environment')

    const project = await this.projectRepository.findById(environment.projectId)

    if (!project) throw new NotFoundError('Project')

    if (project.ownerId !== requestingUserId) throw new ForbiddenError()

    return decrypt(secret.encryptedValue)
  }

  async deleteSecret(secretId: string, projectId: string, requestingUserId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId)

    if (!project) throw new NotFoundError('Project')

    if (project.ownerId !== requestingUserId) throw new ForbiddenError()

    await this.secretRepository.delete(secretId)
  }
}
