import { browserTokenStore, browserOrganizationStore } from '@coasterai/ui-core/provider/BrowserStores'
import { createClients } from '@coasterai/client'

const apiEndpointUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export const frontendClients = {
  apiEndpointUrl,
  ...createClients(apiEndpointUrl, browserTokenStore, browserOrganizationStore)
}

export const portalClient = frontendClients.portalClient