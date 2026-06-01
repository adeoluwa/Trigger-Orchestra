import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

import { User } from "@modules/auth/domain/entities/User";

@Entity('Users')
export class UserEntity implements User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 80 })
  name!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', name: 'github_token', length: 100, nullable: true })
  githubToken!: string | null;

  @Column({ type: 'varchar', name: 'github_username', length: 100, nullable: true })
  githubUsername!: string | null

  @Column({ type: 'text', name: 'refresh_token', nullable: true })
  refreshToken!: string | null

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  isVerified!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}