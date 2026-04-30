import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PatchOverlay } from '@coasterai/renderer'
import { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { JsonObject } from '@bufbuild/protobuf'
import { useVideoStore } from '@/stores/video'
import { debounce } from '@/stores/video/sync'

interface UseAnimationEditReturn {
  /** The current overlay: initial LLM values + user edits merged. */
  overlay: PatchOverlay
  selectedEid: string | null
  setSelectedEid: (eid: string | null) => void
  animEditVersion: number
  /** Apply a single value patch to a prop. */
  applyValuePatch: (id: string, prop: string, value: unknown) => void
  /** Apply a style override. */
  applyStyleOverride: (id: string, style: Record<string, string | number>) => void
  /** Replace the entire overlay (e.g. after reconciliation). */
  setOverlay: (overlay: PatchOverlay) => void
  flushPersist: () => void
  applyArrayPatch: (source: string, next: Record<string, any>[]) => void
}

export function useAnimationEdit(): UseAnimationEditReturn {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)

  const content = selectedSlide?.content
  const slideId = selectedSlide?.id

  const selectedSlideRef = useRef(selectedSlide)
  useEffect(() => { selectedSlideRef.current = selectedSlide }, [selectedSlide])

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEid, setSelectedEid] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<PatchOverlay>({})
  const overlayRef = useRef<PatchOverlay>({})
  const [animEditVersion, setAnimEditVersion] = useState(0)
  const isLoadingRef = useRef(false)

  const mergeOverlayEntry = useCallback((
    id: string,
    updater: (entry: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    setOverlay(prev => {
      const entry = (prev[id] as Record<string, unknown> | undefined) ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: updater(entry),
      }
      overlayRef.current = next
      return next
    })
  }, [])

  // ── Keep window.__PATCH_OVERLAY__ in sync ──────────────────────────────────
  useEffect(() => {
    ; (window as any).__PATCH_OVERLAY__ = overlay
  }, [overlay])

  // Track the slideId that was last loaded to avoid persisting on initial load
  const loadedSlideIdRef = useRef<string | undefined>(undefined)

  // ── Load saved overlay when slide changes and set initial overlay─────────────────────────────────
  useEffect(() => {
    isLoadingRef.current = true
    loadedSlideIdRef.current = slideId
    setSelectedEid(null)
    setAnimEditVersion(0)

    overlayRef.current = (content?.edits as PatchOverlay) ?? {}
    setOverlay(overlayRef.current)
  }, [slideId])

  // ── Apply a single value patch ────────────────────────────────────────────
  const applyValuePatch = useCallback((id: string, prop: string, value: unknown) => {
    mergeOverlayEntry(id, entry => ({
      ...entry,
      [prop]: value,
    }))
    setAnimEditVersion(v => v + 1)
  }, [mergeOverlayEntry])

  const applyArrayPatch = useCallback((source: string, next: Record<string, any>[]) => {
    setOverlay(prev => {
      const updated = { ...prev }

      // remove all existing entries for this source
      for (const key of Object.keys(updated)) {
        if (new RegExp(`^\\w+-${source}-\\d+$`).test(key)) {
          delete updated[key]
        }
      }

      // rewrite from next array with correct indices
      next.forEach((item, i) => {
        for (const [eid, patch] of Object.entries(item)) {
          const primitive = eid.match(/^(\w+)-\w+-\d+$/)?.[1]
          if (primitive) updated[`${primitive}-${source}-${i}`] = patch
        }
      })

      overlayRef.current = updated
      return updated
    })

    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Apply style override ──────────────────────────────────────────────────
  const applyStyleOverride = useCallback((id: string, style: Record<string, string | number>) => {
    mergeOverlayEntry(id, entry => ({
      ...entry,
      style: { ...((entry.style as Record<string, string | number> | undefined) ?? {}), ...style },
    }))
    setAnimEditVersion(v => v + 1)
  }, [mergeOverlayEntry])

  // ── Replace entire overlay ─────────────────────────────────────────────────
  const setOverlayFn = useCallback((newOverlay: PatchOverlay) => {
    overlayRef.current = newOverlay
    setOverlay(newOverlay)
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Debounced persist ────────────────────────────────────────────────────────
  const debouncedPersist = useMemo(
    () =>
      debounce((ov: PatchOverlay) => {
        const slideContent = selectedSlideRef.current?.content
        updateSlide({
          content: {
            ...slideContent,
            edits: ov as unknown as JsonObject,
          },
        } as Slide)
      }, 600),
    [updateSlide]
  )

  useEffect(() => () => debouncedPersist?.cancel?.(), [debouncedPersist])

  useEffect(() => {
    // Skip persisting if we just loaded this slide (initial load or slide switch)
    if (isLoadingRef.current) {
      isLoadingRef.current = false
      return
    }
    // Only persist if slideId matches what we loaded (prevents stale persists)
    if (slideId !== loadedSlideIdRef.current) {
      return
    }
    debouncedPersist(overlay)
  }, [overlay, debouncedPersist, slideId])

  const flushPersist = useCallback(() => {
    debouncedPersist.cancel?.()
    const slideContent = selectedSlideRef.current?.content
    updateSlide({
      content: {
        ...slideContent,
        edits: overlayRef.current as unknown as JsonObject,
      },
    } as Slide)
  }, [debouncedPersist, updateSlide])

  return {
    overlay,
    selectedEid,
    setSelectedEid,
    animEditVersion,
    applyValuePatch,
    applyStyleOverride,
    setOverlay: setOverlayFn,
    flushPersist,
    applyArrayPatch,
  }
}
