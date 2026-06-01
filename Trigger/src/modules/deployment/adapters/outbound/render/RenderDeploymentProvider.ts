import axios, { AxiosInstance } from 'axios'
import { DeploymentProviderPort } from '@modules/deployment/domain/ports'
import { Environment } from '@modules/project/domain/entities/Project'
import { DeploymentStatus } from '@shared/types'
import { ExternalServiceError } from '@shared/errors'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

export class RenderDeploymentProvider implements DeploymentProviderPort {
  private readonly client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: env.RENDER_API_URL,
      headers: {
        Authorization: `Bearer ${env.RENDER_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
  }

  async deploy(
    environment: Environment,
    commitSha: string,
    envVars: Record<string, string>
  ): Promise<string> {
    try {
      if (environment.platformServiceId) {
        await this.syncEnvVars(environment.platformServiceId, envVars)

        const res = await this.client.post(`/services/${environment.platformServiceId}/deploys`, {
          commitId: commitSha,
        })

        return res.data.id
      }

      const res = await this.client.post('/services', {
        type: 'web_service',
        name: `${environment.projectId}-${environment.name}`,
        autoDeploy: 'yes',
        branch: environment.branch,
        serviveDetails: {
          env: 'node',
          buildCommmand: 'pnpm install && pnpm build',
          startCommand: 'node dis/main.js',
        },
        envVars: Object.entries(envVars).map(([key, value]) => ({ key, value })),
      })

      const deployRes = await this.client.post(`/services/${res.data.service.id}/deploys`, {})

      return deployRes.data.id
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Render', `Deploy failed: ${exception.message}`)
    }
  }

  async getStatus(
    platformDeploymentId: string,
    environment: Environment
  ): Promise<DeploymentStatus> {
    try {
      const res = await this.client.get(`/deploys/${platformDeploymentId}`)

      return this.mapStatus(res.data.status)
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Render', `Status check failed : ${exception.message}`)
    }
  }

  async streamLogs(
    platformDeploymentId: string,
    _environment: Environment,
    onLog: (message: string, level: 'info' | 'error') => void
  ): Promise<void> {
    const maxPolls = 120
    let polls = 0
    let lastLogTime: string | null = null

    while (polls < maxPolls) {
      try {
        const statusRes = await this.client.get(`/deploys/${platformDeploymentId}`)
        const status = statusRes.data.status

        const params: Record<string, string> = {}
        if (lastLogTime) params.startingAt = lastLogTime

        const logsRes = await this.client.get(`/services/${statusRes.data.serviceId}/logs`, {
          params: { deployId: platformDeploymentId, ...params },
        })

        const logs: Array<{ message: string; timestamp: string; level?: string }> = logsRes.data
        logs.forEach((log) => {
          onLog(`[${log.timestamp}] ${log.message}`, log.level === 'error' ? 'error' : 'info')
          lastLogTime = log.timestamp
        })

        if (['live', 'failed', 'canceled', 'deactivated'].includes(status)) break
      } catch (err: any) {
        logger.error({ err }, 'Render log poll error')
      }

      await this.sleep(5000)
      polls++
    }
  }

  async cancel(platformDeploymentId: string, environment: Environment): Promise<void> {
    try {
      await this.client.post(`/deploys/${platformDeploymentId}/cancel`)
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Render', `Cancel failed: ${exception.message}`)
    }
  }

  private async syncEnvVars(serviceId: string, vars: Record<string, string>): Promise<void> {
    const envVars = Object.entries(vars).map(([key, value]) => ({ key, value }))
    await this.client.put(`/services/${serviceId}/env-vars`, envVars)
  }

  private mapStatus(renderStatus: string): DeploymentStatus {
    const map: Record<string, DeploymentStatus> = {
      created: 'queued',
      build_in_progress: 'building',
      update_in_progress: 'deploying',
      live: 'success',
      failed: 'failed',
      canceled: 'cancelled',
      deactivated: 'cancelled',
      pre_deploy_in_progress: 'building',
    }
    return map[renderStatus] ?? 'deploying'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
