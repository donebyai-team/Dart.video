import '../styles/global.css'

import { ConfigProvider } from '../context/ConfigContext'
import ThemeRegistry from '../theme/ThemeRegistry'
import ConfigGuard from '../components/guard/ConfigGuard'
import { FallbackSpinner } from '../atoms/FallbackSpinner'
import { StyledReactHotToast } from '@coasterai/ui-core/components/StyledReactHotToast'
import { Toaster } from 'react-hot-toast'
import { NextElementRegistryProvider } from '../context/NextElementRegistryProvider'
import { PortalClientProvider } from '../provider/PortalClientProvider'
import { PortalExecutionRuntimeProvider } from '../provider/PortalExecutionRuntimeProvider'
import NotificationProvider from '@/components/layout/notification'

// const amplitudeApiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '';

export const metadata = {
  title: 'dart.video',
  description: 'Turn features into videos'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <meta name='robots' content='noindex,follow' />
        <link rel="icon" href="/images/favicon.ico" />
        <title>CoasterAI</title>
      </head>

      <body>
          <NextElementRegistryProvider>
            <ConfigGuard fallback={<FallbackSpinner />}>
              <PortalClientProvider>
                <ConfigProvider>
                  <PortalExecutionRuntimeProvider>
                    <ThemeRegistry>
                      <NotificationProvider>
                        {children}
                      </NotificationProvider>
                      <StyledReactHotToast>
                        <Toaster position='top-right' toastOptions={{ className: 'react-hot-toast mt-[47px]' }} />
                      </StyledReactHotToast>
                    </ThemeRegistry>
                  </PortalExecutionRuntimeProvider>
                </ConfigProvider>
              </PortalClientProvider>
            </ConfigGuard>
          </NextElementRegistryProvider>
      </body>
    </html>
  )
}
