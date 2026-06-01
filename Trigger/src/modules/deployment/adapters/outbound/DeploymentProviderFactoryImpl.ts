import { DeploymentProviderFactory, DeploymentProviderPort } from '@modules/deployment/domain/ports'
import { Platform } from '@shared/types'
import { RailwayDeploymentProvider } from '@modules/deployment/adapters/outbound/railway/RailwayDeploymentProvider'
import { RenderDeploymentProvider } from '@modules/deployment/adapters/outbound/render/RenderDeploymentProvider'
import { PlatformNotSupportedError } from '@modules/deployment/domain/errors/DeploymentErrors'

export class DeploymentProviderFactoryImpl implements DeploymentProviderFactory {
  private readonly providers: Map<Platform, DeploymentProviderPort>

  constructor() {
    this.providers = new Map<Platform, DeploymentProviderPort>([
      ['railway', new RailwayDeploymentProvider()],
      ['render', new RenderDeploymentProvider()],
    ])
  }

  get(platform: Platform): DeploymentProviderPort {
    const provider = this.providers.get(platform)

    if (!provider) throw new PlatformNotSupportedError(platform)

    return provider
  }
}
