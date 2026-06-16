import { useCallback, useEffect, useRef, useState } from 'react'
import type { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { SuggestScenesResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import type { GenerateSuggestionsResponse } from '@coasterai/pb/coasterai/portal/v1/templates_pb'
import type { SuggestionItem } from './types'

interface SuggestionsCacheEntry {
  suggestions: SuggestionItem[]
  nextPage?: string
}

const suggestionsCache = new Map<string, SuggestionsCacheEntry>()

interface SuggestionsClient {
  generateSuggestions: (input: {
    videoId: string
    slide?: Slide
    categories: string[]
    pageSize: number
    nextPage?: string
  }) => Promise<GenerateSuggestionsResponse>
  renderSuggestion: (input: {
    videoId: string
    slide?: Slide
    tid: string[]
  }) => Promise<SuggestScenesResponse>
}

interface UseTemplateSuggestionsOptions {
  client: SuggestionsClient
  videoId?: string
  slide: Slide | null
  categories: string[]
  enabled: boolean
  pageSize?: number
  onError: (error: unknown) => void
}

const getRenderableSuggestions = (response: SuggestScenesResponse, templateIds: string[]) => {
  const groups = response.groups ?? []

  return templateIds.map((templateId, index) => ({
    templateId,
    suggestion: groups[index]?.slides.length ? groups[index] : null,
  }))
}

const getCacheKey = ({
  videoId,
  slide,
  categories,
  pageSize,
  cursor,
}: {
  videoId: string
  slide: Slide
  categories: string[]
  pageSize: number
  cursor?: string
}) => [
  videoId,
  slide.id,
  slide.backgroundStyle ? JSON.stringify(slide.backgroundStyle) : '',
  categories.join(','),
  pageSize,
  cursor ?? '',
].join('::')

const mergeSuggestionItems = (current: SuggestionItem[], incoming: SuggestionItem[]) => {
  const seenTemplateIds = new Set(current.map(item => item.templateId))
  return [...current, ...incoming.filter(item => !seenTemplateIds.has(item.templateId))]
}

export const useTemplateSuggestions = ({
  client,
  videoId,
  slide,
  categories,
  enabled,
  pageSize = 4,
  onError,
}: UseTemplateSuggestionsOptions) => {
  const requestIdRef = useRef(0)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState<string | undefined>()

  const loadSuggestions = useCallback(async (cursor?: string) => {
    if (!enabled || !videoId || !slide) {
      requestIdRef.current += 1
      setSuggestions([])
      setNextPage(undefined)
      setIsLoading(false)
      setIsLoadingMore(false)
      return
    }

    const isPaginating = Boolean(cursor)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const cacheKey = getCacheKey({
      videoId,
      slide,
      categories,
      pageSize,
      cursor,
    })
    const cachedEntry = suggestionsCache.get(cacheKey)

    if (cachedEntry) {
      setSuggestions(current => (isPaginating ? mergeSuggestionItems(current, cachedEntry.suggestions) : cachedEntry.suggestions))
      setNextPage(cachedEntry.nextPage)
      setIsLoading(false)
      setIsLoadingMore(false)
      return
    }

    if (isPaginating) {
      setIsLoadingMore(true)
    } else {
      setSuggestions([])
      setNextPage(undefined)
      setIsLoading(true)
    }

    try {
      const response = await client.generateSuggestions({
        videoId,
        slide,
        categories,
        pageSize,
        nextPage: cursor,
      })

      if (requestId !== requestIdRef.current) {
        return
      }

      const templateIds = (response.tid ?? []).filter(Boolean)
      const loadingItems: SuggestionItem[] = templateIds.map(templateId => ({
        templateId,
        suggestion: null,
        status: 'loading',
      }))
      let resolvedItems: SuggestionItem[] = loadingItems

      setSuggestions(current => (isPaginating ? mergeSuggestionItems(current, loadingItems) : loadingItems))
      setNextPage(response.nextPage)

      if (templateIds.length === 0) {
        if (requestId === requestIdRef.current) {
          suggestionsCache.set(cacheKey, {
            suggestions: [],
            nextPage: response.nextPage,
          })
        }
        return
      }

      try {
        const renderResponse = await client.renderSuggestion({
          videoId,
          slide,
          tid: templateIds,
        })

        if (requestId !== requestIdRef.current) {
          return
        }

        const renderedSuggestions = getRenderableSuggestions(renderResponse, templateIds)

        resolvedItems = renderedSuggestions
          .filter(item => item.suggestion)
          .map(item => ({
            templateId: item.templateId,
            suggestion: item.suggestion,
            status: 'ready' as const,
          }))

        setSuggestions(current => {
          if (!isPaginating) {
            return resolvedItems
          }

          const withoutLoadingItems = current.filter(item => !templateIds.includes(item.templateId))
          return mergeSuggestionItems(withoutLoadingItems, resolvedItems)
        })
      } catch {
        if (requestId !== requestIdRef.current) {
          return
        }

        resolvedItems = []
        setSuggestions(current => (isPaginating ? current.filter(item => !templateIds.includes(item.templateId)) : []))
      }

      if (requestId === requestIdRef.current) {
        suggestionsCache.set(cacheKey, {
          suggestions: resolvedItems.filter(
            (item): item is SuggestionItem => item.status === 'ready' && Boolean(item.suggestion)
          ),
          nextPage: response.nextPage,
        })
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setSuggestions(current => (isPaginating ? current : []))
      setNextPage(undefined)
      onError(error)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    }
  }, [categories, client, enabled, onError, pageSize, slide, videoId])

  useEffect(() => {
    void loadSuggestions()
  }, [loadSuggestions])

  return {
    suggestions,
    isLoading,
    isLoadingMore,
    hasMore: Boolean(nextPage),
    loadMore: () => (nextPage ? loadSuggestions(nextPage) : Promise.resolve()),
  }
}
