export interface User {
  id: string
  email: string
  passwordHash: string
  name: string
  githubToken: string | null
  githubUsername: string | null
  refreshToken: string | null
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

