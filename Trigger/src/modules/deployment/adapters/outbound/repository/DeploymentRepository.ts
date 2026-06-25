import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { DeploymentRepository } from '@modules/deployment/domain/ports'
import { Deployment, DeploymentLog } from '@modules/deployment/domain/entities/Deployment'
import { DeploymentTypeOrmEntity } from '@modules/deployment/adapters/outbound/entities/DeploymentEntity'
import { DeploymentLogTypeOrmEntity } from '@modules/deployment/adapters/outbound/entities/DeploymentLogEntity'
import { DeploymentStatus } from '@shared/types'

export class DeploymentTypeOrmRepository implements DeploymentRepository {
  private readonly deploymentRepository: Repository<DeploymentTypeOrmEntity>
  private readonly logRepository: Repository<DeploymentLogTypeOrmEntity>

  constructor(dataSource: DataSource) {
    this.deploymentRepository = dataSource.getRepository(DeploymentTypeOrmEntity)
    this.logRepository = dataSource.getRepository(DeploymentLogTypeOrmEntity)
  }

  async save(data: Omit<Deployment, 'createdAt' | 'updatedAt'>): Promise<Deployment> {
    const entity = this.deploymentRepository.create(data)

    return this.deploymentRepository.save(entity)
  }

  async findById(id: string): Promise<Deployment | null> {
    return this.deploymentRepository.findOneBy({ id })
  }

  async findByEnvironmentId(environmentId: string): Promise<Deployment[]> {
    return this.deploymentRepository.find({
      where: { environmentId },
      order: { createdAt: 'DESC' },
    })
  }

  async findByProjectId(projectId: string): Promise<Deployment[]> {
    return this.deploymentRepository.find({ where: { projectId }, order: { createdAt: 'DESC' } })
  }

  async updateStatus(
    id: string,
    status: DeploymentStatus,
    platformDeploymentId?: string
  ): Promise<void> {
    await this.deploymentRepository.update(id, {
      status,
      ...(platformDeploymentId ? { platformDeploymentId } : {}),
    })
  }

  async complete(id: string, status: 'success' | 'failed'): Promise<void> {
    await this.deploymentRepository.update(id, { status, completedAt: new Date() })
  }

  async appendLog(_deploymentId: string, log: Omit<DeploymentLog, 'id'>): Promise<DeploymentLog> {
    const entity = this.logRepository.create({ ...log, id: uuidv4() })

    return this.logRepository.save(entity)
  }

  async findLastSuccessful(environmentId: string): Promise<Deployment | null> {
    return this.deploymentRepository.findOne({
      where: { environmentId, status: 'success' as DeploymentStatus },
      order: { completedAt: 'DESC' },
    })
  }

  async getLogs(deploymentId: string): Promise<DeploymentLog[]> {
    return this.logRepository.find({ where: { deploymentId }, order: { timestamp: 'ASC' } })
  }

  async findInProgress(): Promise<Deployment[]> {
    return this.deploymentRepository.find({
      where: [
        { status: 'building' as DeploymentStatus },
        { status: 'deploying' as DeploymentStatus },
      ],
    })
  }
}
