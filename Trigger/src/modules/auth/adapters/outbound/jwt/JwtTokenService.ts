import { TokenService } from "@modules/auth/domain/ports";
import { User } from "@modules/auth/domain/entities/User";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "@utils/jwt";

export class JwtTokenService implements TokenService {
  generateAccessToken(user: Pick<User, "id" | "email">): string {
    return signAccessToken({ sub: user.id, email: user.email })
  }

  generateRefreshToken(userId: string): string {
    return signRefreshToken(userId)
  }

  verifyAccessToken(token: string): { sub: string; email: string; } {
    return verifyAccessToken(token)
  }

  verifyRefreshToken(token: string): { sub: string; } {
    return verifyRefreshToken(token)
  }
}