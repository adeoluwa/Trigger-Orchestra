import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'
import { DeploymentLog } from '@modules/deployment/domain/entities/Deployment'
import { LogLevel, LogSource } from '@shared/types'

@Entity('deployment_logs')
export class DeploymentLogTypeOrmEntity implements DeploymentLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid', name: 'deployment_id' })
  deploymentId!: string

  @Column({ type: 'text' })
  message!: string

  @Column({ type: 'varchar', length: 10 })
  level!: LogLevel

  @Column({ type: 'varchar', length: 10 })
  source!: LogSource

  @Column({ type: 'timestamptz' })
  timestamp!: Date
}