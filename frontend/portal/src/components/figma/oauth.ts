'use client'

export const FIGMA_OAUTH_POPUP_MESSAGE_TYPE = 'coasterai:figma-oauth'

export interface FigmaOAuthPopupMessage {
  type: typeof FIGMA_OAUTH_POPUP_MESSAGE_TYPE
  status: 'success' | 'error'
  redirectUrl?: string
  error?: string
}

export const isFigmaOAuthPopupMessage = (value: unknown): value is FigmaOAuthPopupMessage => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const message = value as Partial<FigmaOAuthPopupMessage>
  return (
    message.type === FIGMA_OAUTH_POPUP_MESSAGE_TYPE &&
    (message.status === 'success' || message.status === 'error')
  )
}
