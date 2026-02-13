import { Config, ConfigSchema, UploadMediaResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { portalClient } from './grpc'
import { log } from './logger'
import { create } from '@bufbuild/protobuf'
import { browserTokenStore } from '@coasterai/ui-core/provider/BrowserStores'

// this is present on build (i.e. http://api.freightstream.ai)
export const CONFIG_API_URI = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// this is present on build (i.e. http://app.freightstream.ai)
export const CONFIG_PORTAL_URI = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export class ConfigProvider {
  config: Config

  constructor() {
    this.config = create(ConfigSchema, {
      auth0Domain: 'domain.auth0.com',
      auth0ClientId: 'xxxxxxxxxxxxxxxx',
      auth0Scope: 'openid email',
      msoftAuth0CallbackUrl: 'http://msoftcallback',
      googleAuth0CallbackUrl: 'http://googlecallback'
    })
  }

  async bootstrap(): Promise<Config> {
    // this.config = await this.buildConfig()

    return this.config
  }

  async fetchFromBackend(): Promise<Config> {
    return portalClient.getConfig({})
  }

  async uploadMedia(file: File): Promise<UploadMediaResponse> {
    // Check file size (10 MB = 10 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB in bytes

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 10 MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`)
    }

    const token = await browserTokenStore.Get()
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${CONFIG_API_URI}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token?.token}`
      },
      body: formData
    })
    const data = await response.json()

    console.log(data, "data")

    return data
  }

  async buildConfig(): Promise<Config> {
    const backendConfig = await this.fetchFromBackend()

    if (backendConfig === null) {
      throw new Error('No backend configuration found')
    }

    log.info('retrieve config', { config: backendConfig })

    return backendConfig
  }
}

export const configProvider = new ConfigProvider()
