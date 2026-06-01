import { z } from 'zod'

export const RegisterUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})
export type RegisterUserDto = z.infer<typeof RegisterUserSchema>

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginUserDto = z.infer<typeof LoginUserSchema>

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>

export interface AuthResult {
  user: { id: string; email: string; name: string }
  accessToken: string
  refreshToken: string
}

export interface RefreshResult {
  accessToken: string
  refreshToken: string
}