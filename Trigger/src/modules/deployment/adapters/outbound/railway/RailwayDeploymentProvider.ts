import axios from 'axios'
import { DeploymentProviderPort } from '@modules/deployment/domain/ports'
import { Environment } from '@modules/project/domain/entities/Project'
import { DeploymentStatus } from '@shared/types'
import { ExternalServiceError } from '@shared/errors'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'
import { da } from 'zod/v4/locales'

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
  async deploy(
    environment: Environment,
    _commitSha: string,
    envVars: Record<string, string>
  ): Promise<string> {
    try {
      if (environment.platformServiceId) {
        await this.syncEnvVars(environment.platformServiceId, envVars)

        const data = await gql<{ serviceInstanceRedeploy: { id: string } }>(
          `
          mutation serviceRedeploy($serviceId: String!) {
            serviceInstanceRedeploy(serviceId: $serviceId){
              id
            }
          }
        `,
          { serviceId: environment.platformServiceId }
        )

        return data.serviceInstanceRedeploy.id
      }

      const data = await gql<{ serviceCreate: { id: string; latestDeployment: { id: string } } }>(
        `
        mutation ServiceCreate($input: ServiceCreateInput! ) {
          serviceCreate(input: $input) {
            id
            latestDeployment {
              id
            }
          }
        }
      `,
        {
          input: {
            branch: environment.branch,
            name: `${environment.projectId}-${environment.name}`,
          },
        }
      )

      return data.serviceCreate.latestDeployment?.id ?? data.serviceCreate.id
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
    environment: Environment,
    onLog: (message: string, level: 'info' | 'error') => void
  ): Promise<void> {
    const maxPolls = 120
    let polls = 0

    while (polls < maxPolls) {
      try {
        const data = await gql<{
          deployment: {
            status: string
            logs: { message: string; severity: string; timestamp: string }[]
          }
        }>(
          `
          query DeploymentLogs($id: String!) {
            deployment(id: $id) {
              status
              logs {
                message
                severity
                timestamp
              }
            }
          }
        `,
          { id: platformDeploymentId }
        )

        const { status, logs } = data.deployment
        logs.forEach((log) => {
          onLog(`[${log.timestamp}] ${log.message}`, log.severity === 'ERROR' ? 'error' : 'info')
        })

        if (['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED'].includes(status)) break
      } catch (error) {
        const exception = error as Error

        logger.error({ exception }, 'Railway log poll error')
      }

      await this.sleep(5000)

      polls++
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
