'use client'

import { BrowserClientProvider } from '@coasterai/ui-core/provider/BrowserClientProvider'
import { FC, ReactNode } from 'react'
import { frontendClients } from '../services/grpc'

export const PortalClientProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <BrowserClientProvider clients={frontendClients}>{children}</BrowserClientProvider>
)
