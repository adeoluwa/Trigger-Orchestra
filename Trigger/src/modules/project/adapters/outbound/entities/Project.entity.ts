import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm";
import { Project } from "@modules/project/domain/entities/Project";
import { EnvironmentEntity } from "./Environment.entity";

@Entity('projects')
export class ProjectEntity implements Omit<Project, 'environments'> {
  @PrimaryGeneratedColumn('uuid')
  id!: string
  
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Index()
  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string

  @Column({ type: 'varchar', name: 'repo_url' })
  repoUrl!: string

  @Column({ type: 'varchar', name: 'repo_provider', default: 'github' })
  repoProvider!: 'github'

   @Column({ type: 'varchar', name: 'config_path', default: 'trigger.yml' })
  configPath!: string

  @OneToMany(() => EnvironmentEntity, (e) => e.project, { cascade: true })
  environments!: EnvironmentEntity[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}