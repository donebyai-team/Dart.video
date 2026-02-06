'use client'

import { ReactNode, ReactElement, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@coasterai/ui-core/hooks/useAuth'
import { browserTokenStore } from '@coasterai/ui-core/provider/BrowserStores'
import { routes } from '@coasterai/ui-core/routing'

interface AuthGuardProps {
  children: ReactNode
  fallback: ReactElement | null
}

const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const path = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAuthAndSetup = async () => {
      if (authLoading) return

      if (!user) {
        const token = await browserTokenStore.Get()
        if (!token) {
          router.replace(routes.app.auth.login)
          return
        }
        // If we have a token but no user yet, wait for auth to complete
        return
      }

      // If we have a user, we're authenticated - mark as ready
      setIsReady(true)
    }

    checkAuthAndSetup()
  }, [authLoading, user, path, router])

  // Strict block on rendering until ready
  if (!isReady) {
    return fallback
  }

  return <>{children}</>
}

export default AuthGuard