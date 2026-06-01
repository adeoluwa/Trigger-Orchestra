import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { EnvironmentRepository } from '@modules/project/domain/ports'
import { Environment } from '@modules/project/domain/entities/Project'
import { EnvironmentEntity } from '../entities/Environment.entity'

export class EnvironmentOrmRepository implements EnvironmentRepository {
  private readonly repository: Repository<EnvironmentEntity>

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(EnvironmentEntity)
  }

  async saveMany(data: Omit<Environment, 'createdAt' | 'updatedAt'>[]): Promise<Environment[]> {
    const entities = data.map((d) => this.repository.create(d as EnvironmentEntity))

    return this.repository.save(entities)
  }

  async findByProjectId(projectId: string): Promise<Environment[]> {
    return this.repository.findBy({ projectId })
  }

  async findById(id: string): Promise<Environment | null> {
    return this.repository.findOneBy({ id })
  }

  async update(id: string, data: Partial<Environment>): Promise<Environment> {
    await this.repository.update(id, data as Partial<EnvironmentEntity>)

    return this.repository.findOneOrFail({ where: { id } })
  }

  async updateStatus(id: string, status: Environment['status']): Promise<void> {
    await this.repository.update(id, { status })
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.repository.delete({ projectId })
  }
}
