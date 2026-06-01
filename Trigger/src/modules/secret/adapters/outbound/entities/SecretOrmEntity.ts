import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'
import { Secret } from '@modules/secret/domain/entities/Secret'

@Entity('secrets')
export class SecretTypeOrmEntity implements Secret {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid', name: 'environment_id' })
  environmentId!: string

  @Column({ type: 'varchar', length: 200 })
  key!: string

  @Column({ type: 'text', name: 'encrypted_value' })
  encryptedValue!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}