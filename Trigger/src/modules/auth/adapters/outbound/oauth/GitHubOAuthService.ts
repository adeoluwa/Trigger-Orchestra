import axios from 'axios'
import type { GitHubOAuthPort, GitHubProfile, GitHubRepo } from '@modules/auth/domain/ports'
import { env } from '@config/env'

export class GitHubOAuthService implements GitHubOAuthPort {
  async getAccessToken(code: string): Promise<string> {
    const res = await axios.post<string>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    )

    const data = res.data as unknown as { access_token?: string; error?: string }

    if (data.error || !data.access_token) {
      throw new Error(data.error ?? 'Failed to obtain GitHub access token')
    }

    return data.access_token
  }

  async getUserProfile(accessToken: string): Promise<GitHubProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    }

    const { data: profile } = await axios.get('https://api.github.com/user', { headers })

    let email: string | null = profile.email ?? null

    if (!email) {
      const { data: emails } = await axios.get<{ email: string; primary: boolean; verified: boolean }[]>(
        'https://api.github.com/user/emails',
        { headers }
      )
      const primary = emails.find(e => e.primary && e.verified)
      email = primary?.email ?? null
    }

    return {
      id: profile.id,
      login: profile.login,
      email,
      name: profile.name ?? null,
    }
  }

  async getRepos(accessToken: string): Promise<GitHubRepo[]> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    }

    const { data } = await axios.get<GitHubRepo[]>(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
      { headers }
    )

    return data
  }
}
