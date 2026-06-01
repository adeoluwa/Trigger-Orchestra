import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { env } from '@config/env'
import { UserEntity } from '@modules/auth/adapters/outbound/entities/UserEntity'
import { ProjectEntity } from '@modules/project/adapters/outbound/entities/Project.entity'
import { EnvironmentEntity } from '@modules/project/adapters/outbound/entities/Environment.entity'
import { DeploymentTypeOrmEntity } from '@modules/deployment/adapters/outbound/entities/DeploymentEntity'
import { DeploymentLogTypeOrmEntity } from '@modules/deployment/adapters/outbound/entities/DeploymentLogEntity'
import { SecretTypeOrmEntity } from '@modules/secret/adapters/outbound/entities/SecretOrmEntity'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [
    UserEntity,
    ProjectEntity,
    EnvironmentEntity,
    DeploymentTypeOrmEntity,
    DeploymentLogTypeOrmEntity,
    SecretTypeOrmEntity,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
})

export async function initDatabase(): Promise<void> {
  await AppDataSource.initialize()
  await AppDataSource.runMigrations()
}
