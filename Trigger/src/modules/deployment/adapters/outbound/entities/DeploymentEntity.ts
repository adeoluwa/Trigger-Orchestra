import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'
import { Deployment } from '@modules/deployment/domain/entities/Deployment'
import { DeploymentStatus, Platform } from '@shared/types'

@Entity('deployments')
export class DeploymentTypeOrmEntity implements Deployment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid', name: 'environment_id' })
  environmentId!: string

  @Index()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string

  @Column({ type: 'uuid', name: 'triggered_by' })
  triggeredBy!: string

  @Column({ type: 'varchar', name: 'commit_sha', length: 40 })
  commitSha!: string

  @Column({ type: 'text', name: 'commit_message' })
  commitMessage!: string

  @Column({ type: 'varchar', length: 20 })
  status!: DeploymentStatus

  @Column({ type: 'varchar', length: 20 })
  platform!: Platform

  @Column({ type: 'varchar', name: 'platform_deployment_id', nullable: true })
  platformDeploymentId!: string | null

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}