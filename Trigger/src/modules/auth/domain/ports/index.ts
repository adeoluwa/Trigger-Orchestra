import { User } from '@modules/auth/domain/entities/User'

export interface AuthRepository {
  save(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  findbyId(id:string): Promise<User | null>
  findByEmail(email: string): Promise<User|null>
  updateRefreshToken(userId: string, token: string | null): Promise<void>
updateGithubCredentials(userId: string, token: string, username: string): Promise<void>
}

export interface GitHubProfile {
  id: number
  login: string
  email: string | null
  name: string | null
}

export interface GitHubOAuthPort {
  getAccessToken(code: string): Promise<string>
  getUserProfile(accessToken: string): Promise<GitHubProfile>
}

export interface TokenService {
  generateAccessToken(user: Pick<User, 'id' | 'email'>): string
  generateRefreshToken(userId: string): string
  verifyAccessToken(token:string): {sub: string; email: string }
  verifyRefreshToken(token: string): {sub: string}
}