import { AuthRepository, TokenService, GitHubOAuthPort } from "@modules/auth/domain/ports";
import { RegisterUserDto, LoginUserDto, RefreshTokenDto, AuthResult, RefreshResult } from "../dtos";
import { EmailAlreadyExistError, InvalidCredentialsError } from "@modules/auth/domain/errors/AuthErrors";
import { UnauthorizedError } from "@shared/errors";
import { hashPassword, comparePassword } from "@utils/crypto";
import { randomBytes } from "crypto";

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly githubOAuth?: GitHubOAuthPort
  ) {}

  async register(dto: RegisterUserDto): Promise<AuthResult>{
    const exitingProfile = await this.authRepository.findByEmail(dto.email);

    if (exitingProfile) throw new EmailAlreadyExistError();

    const passwordHash = await hashPassword(dto.password)

    const user = await this.authRepository.save({
      email: dto.email,
      name: dto.name,
      passwordHash,
      githubToken: null,
      githubUsername: null,
      refreshToken: null,
      isVerified: false
    });

    const accessToken = this.tokenService.generateAccessToken({ id: user.id, email: user.email});

    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.authRepository.updateRefreshToken(user.id, refreshToken);

    return { user: {id: user.id, email: user.email, name: user.name}, accessToken, refreshToken};
  }

  async login(dto: LoginUserDto): Promise<AuthResult> {
    const user = await this.authRepository.findByEmail(dto.email);

    if (!user) throw new InvalidCredentialsError();

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);

    if (!isPasswordValid) throw new InvalidCredentialsError();

    const accessToken = this.tokenService.generateAccessToken({ id: user.id, email: user.email});

    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.authRepository.updateRefreshToken(user.id, refreshToken);

    return { user: { id: user.id, email: user.email, name: user.name}, accessToken, refreshToken}
  };

  async githubLogin(code: string): Promise<AuthResult> {
    if (!this.githubOAuth) throw new Error('GitHub OAuth is not configured')

    const githubToken = await this.githubOAuth.getAccessToken(code)
    const profile = await this.githubOAuth.getUserProfile(githubToken)

    if (!profile.email) throw new InvalidCredentialsError()

    let user = await this.authRepository.findByEmail(profile.email)

    if (!user) {
      user = await this.authRepository.save({
        email: profile.email,
        name: profile.name ?? profile.login,
        passwordHash: randomBytes(32).toString('hex'),
        githubToken,
        githubUsername: profile.login,
        refreshToken: null,
        isVerified: true,
      })
    } else {
      await this.authRepository.updateGithubCredentials(user.id, githubToken, profile.login)
    }

    const accessToken = this.tokenService.generateAccessToken({ id: user.id, email: user.email })
    const refreshToken = this.tokenService.generateRefreshToken(user.id)

    await this.authRepository.updateRefreshToken(user.id, refreshToken)

    return { user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken }
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findbyId(userId)
    if (!user) throw new UnauthorizedError('User not found')
    return { id: user.id, email: user.email, name: user.name, githubUsername: user.githubUsername }
  }

  async createRepoConfig(userId: string, owner: string, repo: string, content: string): Promise<void> {
    if (!this.githubOAuth) throw new Error('GitHub OAuth is not configured')
    const user = await this.authRepository.findbyId(userId)
    if (!user) throw new UnauthorizedError('User not found')
    if (!user.githubToken) throw new UnauthorizedError('No GitHub token — please sign in with GitHub first')
    await this.githubOAuth.createFile(
      user.githubToken,
      owner,
      repo,
      'trigger.yml',
      content,
      'chore: add trigger.yml deployment config'
    )
  }

  async getGithubRepos(userId: string) {
    if (!this.githubOAuth) throw new Error('GitHub OAuth is not configured')
    const user = await this.authRepository.findbyId(userId)
    if (!user) throw new UnauthorizedError('User not found')
    if (!user.githubToken) throw new UnauthorizedError('No GitHub token — please sign in with GitHub first')
    return this.githubOAuth.getRepos(user.githubToken)
  }

  async refresh(dto: RefreshTokenDto): Promise<RefreshResult> {
    const payload = this.tokenService.verifyRefreshToken(dto.refreshToken);

    const user = await this.authRepository.findbyId(payload.sub);

    if (!user || user.refreshToken !== dto.refreshToken) {
      if (user) await this.authRepository.updateRefreshToken(user.id, null);

      throw new UnauthorizedError('Refresh token reuse detected')
    }

    const accessToken = this.tokenService.generateAccessToken({ id: user.id, email: user.email});

    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.authRepository.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken}
  }
}