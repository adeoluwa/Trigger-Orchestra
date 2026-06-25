import axios from 'axios'
import { DeploymentProviderPort, CreateServiceParams } from '@modules/deployment/domain/ports'
import { Environment } from '@modules/project/domain/entities/Project'
import { DeploymentStatus } from '@shared/types'
import { ExternalServiceError } from '@shared/errors'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await axios.post(
    env.RAILWAY_API_URL,
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`,
      },
    }
  )

  if (res.data.errors) {
    throw new ExternalServiceError('Railway', res.data.errors[0]?.message ?? 'GraphQL error')
  }

  return res.data.data
}

export class RailwayDeploymentProvider implements DeploymentProviderPort {
  async createService(params: CreateServiceParams): Promise<string> {
    try {
      const repoName = params.repoUrl.replace('https://github.com/', '').replace(/\.git$/, '')
      const data = await gql<{ serviceCreate: { id: string } }>(
        `mutation ServiceCreate($input: ServiceCreateInput!) {
          serviceCreate(input: $input) { id }
        }`,
        {
          input: {
            projectId: params.platformAccountId,
            name: params.name,
            source: { repo: { repoName, branch: params.branch } },
          },
        }
      )
      return data.serviceCreate.id
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError('Railway', `Service creation failed: ${exception.message}`)
    }
  }

  async deploy(
    environment: Environment,
    _commitSha: string,
    envVars: Record<string, string>
  ): Promise<string> {
    if (!environment.platformServiceId) {
      throw new ExternalServiceError(
        'Railway',
        'platformServiceId is not configured for this environment. Set it in environment settings before deploying.'
      )
    }

    try {
      await this.syncEnvVars(environment.platformServiceId, envVars)

      const data = await gql<{ serviceInstanceRedeploy: { id: string } }>(
        `
        mutation serviceRedeploy($serviceId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId) {
            id
          }
        }
      `,
        { serviceId: environment.platformServiceId }
      )

      return data.serviceInstanceRedeploy.id
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Railway', `Deploy failed: ${exception.message}`)
    }
  }

  async getStatus(
    platformDeploymentId: string,
    _environment: Environment
  ): Promise<DeploymentStatus> {
    try {
      const data = await gql<{ deployment: { status: string } }>(
        `
        query DeploymentStatus($id: String! ) {
          deployment(id: $id) {
            status
          }
        }
      `,
        { id: platformDeploymentId }
      )

      return this.mapStatus(data.deployment.status)
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Railway', `Status check failed: ${exception.message}`)
    }
  }

  async streamLogs(
    platformDeploymentId: string,
    _environment: Environment,
    onLog: (message: string, level: 'info' | 'error') => void
  ): Promise<void> {
    const maxPolls = 120
    let polls = 0
    const seen = new Set<string>()

    while (polls < maxPolls) {
      // Status check is isolated from log fetching — a logs-query failure must NOT
      // prevent terminal-state detection. Previously logs were requested as a `logs`
      // subfield of `deployment`, which does not exist on Railway's schema, so the whole
      // query (status included) errored every poll and the loop never broke early.
      let status: string | undefined
      try {
        const data = await gql<{ deployment: { status: string } }>(
          `query DeploymentStatus($id: String!) {
            deployment(id: $id) { status }
          }`,
          { id: platformDeploymentId }
        )
        status = data.deployment.status
      } catch (error) {
        logger.error({ error }, 'Railway status poll error')
      }

      if (status && ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED'].includes(status)) {
        onLog(
          `Deployment ${status === 'SUCCESS' ? 'succeeded' : `ended with status: ${status}`}`,
          status === 'SUCCESS' ? 'info' : 'error'
        )
        break
      }

      // Logs are best-effort, fetched via the dedicated deploymentLogs query.
      try {
        const data = await gql<{
          deploymentLogs: { message: string; severity: string; timestamp: string }[]
        }>(
          `query DeploymentLogs($id: String!) {
            deploymentLogs(deploymentId: $id) {
              message
              severity
              timestamp
            }
          }`,
          { id: platformDeploymentId }
        )

        for (const log of data.deploymentLogs ?? []) {
          const key = `${log.timestamp}|${log.message}`
          if (seen.has(key)) continue
          seen.add(key)
          onLog(`[${log.timestamp}] ${log.message}`, log.severity === 'ERROR' ? 'error' : 'info')
        }
      } catch (error) {
        logger.error({ error }, 'Railway log fetch error')
      }

      await this.sleep(5000)
      polls++
    }
  }

  async rollback(
    lastPlatformDeploymentId: string,
    _lastCommitSha: string,
    _environment: Environment
  ): Promise<string> {
    try {
      // Railway keeps full deployment history — redeploying by ID restores that exact build
      const data = await gql<{ deploymentRedeploy: { id: string } }>(
        `mutation DeploymentRedeploy($id: String!) {
          deploymentRedeploy(id: $id) { id }
        }`,
        { id: lastPlatformDeploymentId }
      )
      return data.deploymentRedeploy.id
    } catch (error) {
      const exception = error as Error
      throw new ExternalServiceError('Railway', `Rollback failed: ${exception.message}`)
    }
  }

  async cancel(platformDeploymentId: string, _environment: Environment): Promise<void> {
    try {
      await gql(
        `
        mutation DeploymentCancel($id: String!) {
          deploymentCancel(id: $id) {
            id
          }
        }
      `,
        { id: platformDeploymentId }
      )
    } catch (error) {
      const exception = error as Error

      throw new ExternalServiceError('Railway', `Cancel failed: ${exception.message}`)
    }
  }

  private async syncEnvVars(serviceId: string, vars: Record<string, string>): Promise<void> {
    const variables = Object.entries(vars).map(([name, value]) => ({ name, value }))
    await gql(
      `
      mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }
    `,
      { input: { serviceId, variables } }
    )
  }

  private mapStatus(railwayStatus: string): DeploymentStatus {
    const map: Record<string, DeploymentStatus> = {
      BUILDING: 'building',
      DEPLOYING: 'deploying',
      SUCCESS: 'success',
      FAILED: 'failed',
      CRASHED: 'failed',
      REMOVED: 'cancelled',
      QUEUED: 'queued',
      INITIALIZING: 'queued',
    }
    return map[railwayStatus] ?? 'deploying'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
