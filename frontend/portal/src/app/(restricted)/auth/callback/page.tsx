'use client'

import { FIGMA_OAUTH_POPUP_MESSAGE_TYPE } from '@/components/figma/oauth'
import { routes } from '@coasterai/ui-core/routing'
import { FallbackSpinner } from '../../../../atoms/FallbackSpinner'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { portalClient } from '../../../../services/grpc'
import { useRouter } from 'next/navigation'
import { log } from '../../../../services/logger'
import toast from 'react-hot-toast'
import { getConnectError } from '@/utils/error'


export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      if (!searchParams) {
        throw new Error('Missing search params')
      }

      // If its a microsoft callback, we get back a tenant and code is null
      // If its a google callback, we get back a code and tenant is null
      const { code, tenant, stateHash, error } = {
        code: searchParams.get('code') ?? undefined,
        tenant: searchParams.get('tenant'),
        stateHash: searchParams.get('state'),
        error: searchParams.get('error')
      }
      // we always should have a state but if we don't, we raise an error
      if (!stateHash) {
        throw new Error('No state hash found')
      }
      if (error || (!code && !tenant)) {
        console.error('callback error: ', error ?? 'no code')
      }

      log.info({ code, tenant, stateHash, error }, 'callback')
      const res = await portalClient.oauthCallback(
        {
          state: stateHash,
          externalCode: tenant ?? code
        },
        {
          timeoutMs: 30000
        }
      )
      log.info({ redirectUrl: res.redirectUrl }, 'callback answer')

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: FIGMA_OAUTH_POPUP_MESSAGE_TYPE,
            status: 'success',
            redirectUrl: res.redirectUrl
          },
          window.location.origin
        )
        window.close()
        return
      }

      router.push(res.redirectUrl)
    }

    handleCallback().catch((err) => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: FIGMA_OAUTH_POPUP_MESSAGE_TYPE,
            status: 'error',
            error: getConnectError(err)
          },
          window.location.origin
        )
        window.close()
        return
      }

      toast.error(getConnectError(err))
      router.push(routes.app.home)
    })


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return <FallbackSpinner />
}
