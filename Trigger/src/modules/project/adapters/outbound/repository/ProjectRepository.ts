import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { ProjectRepository, EnvironmentRepository } from '@modules/project/domain/ports'
import { Project, Environment } from '@modules/project/domain/entities/Project'
import { EnvironmentEntity } from '../entities/Environment.entity'
import { ProjectEntity } from '../entities/Project.entity'

export class ProjectOrmRepository implements ProjectRepository {
  private readonly repository: Repository<ProjectEntity>

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProjectEntity)
  }

  async save(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'environments'>
  ): Promise<Project> {
    // Cast data to any to satisfy TypeORM DeepPartial typing for repoProvider union types
    const entity = this.repository.create({ ...data, id: uuidv4() } as ProjectEntity)
    const saved = await this.repository.save(entity)
    return { ...saved, environments: [] }
  }

  async findById(id: string): Promise<Project | null> {
    const entity = await this.repository.findOneBy({ id })

    if (!entity) return null

    return { ...entity, environments: [] }
  }

  async findByIdWithEnvironments(id: string): Promise<Project | null> {
    return this.repository.findOne({ where: { id }, relations: { environments: true } })
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    return this.repository.find({
      where: { ownerId },
      relations: { environments: true },
      order: { createdAt: 'DESC' },
    })
  }

  async update(id: string, data: Partial<Project>): Promise<Project> {
    await this.repository.update(id, data as Partial<ProjectEntity>)
    return this.repository.findOneOrFail({ where: { id }, relations: { environments: true } })
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
