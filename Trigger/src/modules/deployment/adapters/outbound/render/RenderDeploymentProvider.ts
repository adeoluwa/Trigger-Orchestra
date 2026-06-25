import axios, { AxiosInstance } from 'axios'
import { DeploymentProviderPort, CreateServiceParams } from '@modules/deployment/domain/ports'
import { Environment } from '@modules/project/domain/entities/Project'
import { DeploymentStatus } from '@shared/types'
import { ExternalServiceError } from '@shared/errors'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

const RENDER_TERMINAL = new Set([
  'live',
  'build_failed',
  'update_failed',
  'pre_deploy_failed',
  'failed',
  'canceled',
  'deactivated',
])

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

  async createService(params: CreateServiceParams): Promise<string> {
    try {
      const res = await this.client.post('/services', {
        type: 'web_service',
        name: params.name,
        ownerId: params.platformAccountId,
        repo: params.repoUrl,
        branch: params.branch,
        autoDeploy: 'no',
        serviceDetails: {
          env: 'node',
          plan: 'free',
          envSpecificDetails: {
            buildCommand: params.buildCommand ?? 'npm install && npm run build',
            startCommand: params.startCommand ?? 'npm start',
          },
        },
      })
      const serviceId = res.data.service?.id ?? res.data.id
      if (!serviceId) throw new ExternalServiceError('Render', 'Service created but no ID returned')
      return serviceId
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const body = error.response?.data
        const msg = body?.message ?? body?.error ?? JSON.stringify(body) ?? error.message
        throw new ExternalServiceError('Render', `Service creation failed: ${msg}`)
      }
      throw new ExternalServiceError('Render', `Service creation failed: ${(error as Error).message}`)
    }
  }

  async deploy(
    environment: Environment,
    commitSha: string,
    envVars: Record<string, string>
  ): Promise<string> {
    if (!environment.platformServiceId) {
      throw new ExternalServiceError(
        'Render',
        'platformServiceId is not configured for this environment. Set it in environment settings before deploying.'
      )
    }

    try {
      await this.syncEnvVars(environment.platformServiceId, envVars)

      const res = await this.client.post(`/services/${environment.platformServiceId}/deploys`, {
        commitId: commitSha,
      })

      // Render returns either { id, status, ... } or { deploy: { id, status, ... } }
      const deployData = res.data.deploy ?? res.data
      const deployId = deployData?.id
      if (!deployId) {
        throw new ExternalServiceError('Render', 'Deploy triggered but no deploy ID returned')
      }
      return deployId
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const body = error.response?.data
        const msg = body?.message ?? body?.error ?? JSON.stringify(body) ?? error.message
        if (error.response?.status === 404) {
          throw new ExternalServiceError(
            'Render',
            `Service not found (${environment.platformServiceId}). It may have been deleted — update the service ID in environment settings.`
          )
        }
        throw new ExternalServiceError('Render', `Deploy failed: ${msg}`)
      }
      throw new ExternalServiceError('Render', `Deploy failed: ${(error as Error).message}`)
    }
  }

  async getStatus(
    platformDeploymentId: string,
    environment: Environment
  ): Promise<DeploymentStatus> {
    if (!environment.platformServiceId) {
      throw new ExternalServiceError(
        'Render',
        'platformServiceId is not configured; cannot check deploy status.'
      )
    }
    try {
      // Render deploys are nested under their service — there is no top-level /deploys/:id route.
      const res = await this.client.get(
        `/services/${environment.platformServiceId}/deploys/${platformDeploymentId}`
      )
      const deployData = res.data.deploy ?? res.data
      return this.mapStatus(deployData.status)
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError('Render', `Status check failed: ${exception.message}`)
    }
  }

  async streamLogs(
    platformDeploymentId: string,
    environment: Environment,
    onLog: (message: string, level: 'info' | 'error') => void
  ): Promise<void> {
    const serviceId = environment.platformServiceId
    if (!serviceId) {
      onLog('platformServiceId is not configured; cannot stream logs or detect completion.', 'error')
      return
    }

    // Render serves logs from the top-level /v1/logs endpoint, filtered by ownerId + resource.
    // Look the owner up once; if it fails, logs are simply skipped (status detection still works).
    let ownerId: string | null = null
    try {
      const svcRes = await this.client.get(`/services/${serviceId}`)
      ownerId = (svcRes.data.service ?? svcRes.data)?.ownerId ?? null
    } catch (err: any) {
      logger.error({ err }, 'Render owner lookup (for logs) failed')
    }

    const maxPolls = 120
    let polls = 0
    let lastLogTime: string | null = null

    while (polls < maxPolls) {
      // Status check is isolated — a log-fetch failure must NOT prevent terminal detection
      let status: string | undefined
      try {
        // Deploys are service-scoped on Render; the top-level /deploys/:id route does not exist.
        const statusRes = await this.client.get(
          `/services/${serviceId}/deploys/${platformDeploymentId}`
        )
        const deployData = statusRes.data.deploy ?? statusRes.data
        status = deployData.status
      } catch (err: any) {
        logger.error({ err }, 'Render status poll error')
      }

      // Break on terminal status BEFORE fetching logs — logs are best-effort only
      if (status && RENDER_TERMINAL.has(status)) {
        onLog(
          `Deployment ${status === 'live' ? 'succeeded' : `ended with status: ${status}`}`,
          status === 'live' ? 'info' : 'error'
        )
        break
      }

      // Fetch logs independently; failures here must not stall status polling.
      if (ownerId) {
        try {
          const params: Record<string, string> = {
            ownerId,
            resource: serviceId,
            direction: 'forward',
            limit: '100',
          }
          if (lastLogTime) params.startTime = lastLogTime

          const logsRes = await this.client.get('/logs', { params })

          const logs: Array<{
            message: string
            timestamp: string
            labels?: Array<{ name: string; value: string }>
          }> = logsRes.data?.logs ?? []

          for (const log of logs) {
            const level = log.labels?.find((l) => l.name === 'level')?.value
            onLog(`[${log.timestamp}] ${log.message}`, level === 'error' ? 'error' : 'info')
            lastLogTime = log.timestamp
          }
        } catch (err: any) {
          logger.error({ err }, 'Render log fetch error')
        }
      }

      await this.sleep(5000)
      polls++
    }
  }

  async rollback(
    _lastPlatformDeploymentId: string,
    lastCommitSha: string,
    environment: Environment
  ): Promise<string> {
    const serviceId = environment.platformServiceId
    if (!serviceId) {
      throw new ExternalServiceError(
        'Render',
        'Cannot rollback: platformServiceId is not configured for this environment.'
      )
    }
    try {
      const res = await this.client.post(`/services/${serviceId}/deploys`, {
        commitId: lastCommitSha,
      })
      const deployData = res.data.deploy ?? res.data
      return deployData.id
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError('Render', `Rollback failed: ${exception.message}`)
    }
  }

  async cancel(platformDeploymentId: string, environment: Environment): Promise<void> {
    if (!environment.platformServiceId) {
      throw new ExternalServiceError(
        'Render',
        'platformServiceId is not configured; cannot cancel deploy.'
      )
    }
    try {
      await this.client.post(
        `/services/${environment.platformServiceId}/deploys/${platformDeploymentId}/cancel`
      )
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
      build_failed: 'failed',
      update_failed: 'failed',
      pre_deploy_failed: 'failed',
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
