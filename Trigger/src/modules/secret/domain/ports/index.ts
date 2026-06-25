import { Secret } from '../entities/Secret'

export interface SecretRepository {
  upsert(environmentId: string, key: string, encryptedValue: string): Promise<Secret>
  findById(id: string): Promise<Secret | null>
  findByEnvironmentId(environmentId: string): Promise<Secret[]>
  delete(id: string): Promise<void>
  resolveForEnvironment(environmentId: string): Promise<Record<string, string>>
}
