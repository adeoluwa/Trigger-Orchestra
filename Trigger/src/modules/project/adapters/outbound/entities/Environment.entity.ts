import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Environment } from "@modules/project/domain/entities/Project";
import { Platform, EnvironmentStatus, DockerConfig, RateLimitConfig } from "@shared/types";
import { ProjectEntity} from "./Project.entity";

@Entity('environments')
export class EnvironmentEntity implements Environment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string

  @ManyToOne(() => ProjectEntity, (P) => P.environments, { onDelete: 'CASCADE'})
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity

  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar' })
  platform!: Platform

  @Column({ type: 'varchar' })
  branch!: string

  @Column({ type: 'jsonb', nullable: true })
  docker!: DockerConfig | null

  @Column({ type: 'jsonb', name: 'feature_flags', default: {} })
  featureFlags!: Record<string, boolean>

  @Column({ type: 'jsonb', name: 'rate_limit', nullable: true })
  rateLimit!: RateLimitConfig | null

  @Column({ type: 'varchar', default: 'idle' })
  status!: EnvironmentStatus

  @Column({ type: 'varchar', name: 'platform_service_id', nullable: true })
  platformServiceId!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
