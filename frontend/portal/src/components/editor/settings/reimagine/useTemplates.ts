import { useEffect, useRef, useState } from 'react'
import type { AnimationTemplate } from '@coasterai/pb/coasterai/core/v1/template_pb'
import type { GetTemplatesResponse } from '@coasterai/pb/coasterai/portal/v1/templates_pb'
import type { SuggestionItem } from './types'

interface TemplatesClient {
  getTemplates: (input: {}) => Promise<GetTemplatesResponse>
}

interface UseTemplatesOptions {
  client: TemplatesClient
  enabled: boolean
  onError: (error: unknown) => void
}

const toSuggestionItem = (template: AnimationTemplate): SuggestionItem => ({
  templateId: template.id,
  suggestion: template.config?.sections?.[0] ?? null,
  status: template.config?.sections?.[0] ? 'ready' : 'loading',
})

export const useTemplates = ({ client, enabled, onError }: UseTemplatesOptions) => {
  const requestIdRef = useRef(0)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    const loadTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await client.getTemplates({})

        if (requestId !== requestIdRef.current) {
          return
        }

        setSuggestions((response.templates ?? []).filter(template => Boolean(template.id)).map(toSuggestionItem))
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setSuggestions([])
        onError(error)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadTemplates()
  }, [client, enabled, onError])

  return {
    suggestions,
    isLoading,
  }
}
