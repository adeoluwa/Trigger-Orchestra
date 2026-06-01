import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { AuthRepository } from '@modules/auth/domain/ports'
import { User } from '@modules/auth/domain/entities/User'
import { UserEntity } from '@modules/auth/adapters/outbound/entities/UserEntity'

export class UserRepository implements AuthRepository {
  private readonly repository: Repository<UserEntity>

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity)
  }

  async save(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userEntity = this.repository.create({ ...data, id: uuidv4() })

    return this.repository.save(userEntity)
  }

  async findbyId(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email })
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    await this.repository.update(userId, { refreshToken: token })
  }

  async updateGithubCredentials(userId: string, token: string, username: string): Promise<void> {
    await this.repository.update(userId, { githubToken: token, githubUsername: username })
  }

  async update(userId: string, data: Partial<User>): Promise<User> {
    await this.repository.update(userId, data)
    return this.repository.findOneByOrFail({ id: userId })
  }
}
