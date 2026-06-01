import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { SecretRepository } from '@modules/secret/domain/ports'
import { Secret } from '@modules/secret/domain/entities/Secret'
import { SecretTypeOrmEntity } from '@modules/secret/adapters/outbound/entities/SecretOrmEntity'
import { decrypt } from '@utils/crypto'

export class SecretTypeOrmRepository implements SecretRepository {
  private readonly repository: Repository<SecretTypeOrmEntity>

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(SecretTypeOrmEntity)
  }

  async upsert(environmentId: string, key: string, encryptedValue: string): Promise<Secret> {
    const existing = await this.repository.findOneBy({ environmentId, key })

    if (existing) {
      await this.repository.update(existing.id, { encryptedValue })
      return this.repository.findOneByOrFail({ id: existing.id })
    }

    const entity = this.repository.create({ id: uuidv4(), environmentId, key, encryptedValue })

    return this.repository.save(entity)
  }

  async findByEnvironmentId(environmentId: string): Promise<Secret[]> {
    return this.repository.findBy({ environmentId })
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }

  async resolveForEnvironment(environmentId: string): Promise<Record<string, string>> {
    const secrets = await this.repository.findBy({ environmentId })

    return secrets.reduce(
      (acc, secret) => {
        acc[secret.key] = decrypt(secret.encryptedValue)

        return acc
      },
      {} as Record<string, string>
    )
  }
}
