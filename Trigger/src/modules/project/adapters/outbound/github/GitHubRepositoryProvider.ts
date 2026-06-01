import axios from 'axios'
import { RepositoryProviderPort } from '@modules/project/domain/ports'
import { ExternalServiceError } from '@shared/errors'

import { logger } from '@infra/logger/logger'

const GITHUB_API_BASE = 'https://api.github.com'

function repoToPath(repoUrl: string): string {
  return repoUrl.replace('https://github.com/', '').replace(/\.git$/, '')
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export class GitHubRepositoryProvider implements RepositoryProviderPort {
  async validateRepo(repoUrl: string, token: string): Promise<boolean> {
    try {
      const res = await axios.get(`${GITHUB_API_BASE}/repos/${repoToPath(repoUrl)}`, {
        headers: headers(token),
      })
      return res.status === 200
    } catch (error) {
      return false
    }
  }

  async getLatestCommit(
    repoUrl: string,
    branch: string,
    token: string
  ): Promise<{ sha: string; message: string }> {
    try {
      const res = await axios.get(
        // `${GITHUB_API_BASE}/repos/${repoToPath(repoUrl)}/commits/${branch}`,
        `${GITHUB_API_BASE}/repos/${repoToPath(repoUrl)}/commits/${encodeURIComponent(branch)}`,
        { headers: headers(token) }
      )

      return { sha: res.data.sha, message: res.data.commit.message }
    } catch (error) {
      const exception = error as Error

      logger.error(
        { message: exception.message, name: exception.name },
        'Failed to fetch latest commit'
      )

      throw new ExternalServiceError('GitHub', 'Failed to fetch latest commit')
    }
  }

  async getFileContent(
    repoUrl: string,
    filePath: string,
    branch: string,
    token: string
  ): Promise<string> {
    try {
      const res = await axios.get(
        `${GITHUB_API_BASE}/repos/${repoToPath(repoUrl)}/contents/${filePath}`,
        { headers: headers(token), params: { ref: branch } }
      )

      return Buffer.from(res.data.content, 'base64').toString('utf8')
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError(
        'GitHub',
        `Could not read file ${filePath}: ${exception.message}`
      )
    }
  }

  async setupWebhook(
    repoUrl: string,
    webhookUrl: string,
    secret: string,
    token: string
  ): Promise<string> {
    try {
      const res = await axios.post(
        `${GITHUB_API_BASE}/repos/${repoToPath(repoUrl)}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push'],
          config: { url: webhookUrl, content_type: 'json', secret, insecure_ssl: '0' },
        },
        { headers: headers(token) }
      )

      return String(res.data.id)
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError('Github', `Webhook setup failed: ${exception.message}`)
    }
  }
}
