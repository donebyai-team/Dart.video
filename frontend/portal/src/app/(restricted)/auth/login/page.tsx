'use client'

import React from 'react'
import { routes } from '@coasterai/ui-core/routing'
import toast from 'react-hot-toast'
import { useAuth } from '@coasterai/ui-core/hooks/useAuth'
import { JWT } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { Box } from '@mui/material'
import { LoginPanel } from '@/components/pages/Login'

export default function Page() {
  const { login } = useAuth()

  return (
    <Box sx={{ width: ['100%', '100%', '450px'] }}>
      <LoginPanel
        onPasswordlessStarted={toast.success}
        onPasswordlessStartError={(errorMessage: string) => {
          toast.error(errorMessage)
        }}
        onPasswordlessVerified={async (jwt: JWT) => {
          return login(jwt).then(() => {
            window.location.href = routes.app.home
          })
        }}
        onPasswordlessVerifyError={(errorMessage: string) => {
          toast.error(errorMessage)
        }}
      />
    </Box>
  )
}