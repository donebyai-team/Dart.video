import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PatchOverlay } from '@coasterai/renderer'
import { AnimationSlideContent, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
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
}

export function useAnimationEdit(): UseAnimationEditReturn {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)

  const content = selectedSlide?.slide?.content
  const slideId = selectedSlide?.slide?.id

  const selectedSlideRef = useRef(selectedSlide)
  useEffect(() => { selectedSlideRef.current = selectedSlide }, [selectedSlide])

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEid, setSelectedEid] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<PatchOverlay>({})
  const overlayRef = useRef<PatchOverlay>({})
  const [animEditVersion, setAnimEditVersion] = useState(0)
  const isLoadingRef = useRef(false)

  // ── Keep window.__PATCH_OVERLAY__ in sync ──────────────────────────────────
  useEffect(() => {
    ; (window as any).__PATCH_OVERLAY__ = overlay
  }, [overlay])

  // ── Load saved overlay when slide changes and set initial overlay─────────────────────────────────
  useEffect(() => {
    isLoadingRef.current = true
    setSelectedEid(null)
    setAnimEditVersion(0)

    overlayRef.current = (content?.edits as PatchOverlay) ?? {}
    setOverlay(overlayRef.current)
  }, [slideId])

  // ── Apply a single value patch ────────────────────────────────────────────
  const applyValuePatch = useCallback((id: string, prop: string, value: unknown) => {
    setOverlay(prev => {
      const entry = prev[id] ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: {
          ...entry,
          value: { ...(entry.value ?? {}), [prop]: value },
        },
      }
      overlayRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Apply style override ──────────────────────────────────────────────────
  const applyStyleOverride = useCallback((id: string, style: Record<string, string | number>) => {
    setOverlay(prev => {
      const entry = prev[id] ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: {
          ...entry,
          styleOverride: { ...(entry.styleOverride ?? {}), ...style },
        },
      }
      overlayRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

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
        const slideContent = selectedSlideRef.current?.slide?.content
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
    if (isLoadingRef.current) {
      isLoadingRef.current = false
      return
    }
    debouncedPersist(overlay)
  }, [overlay, debouncedPersist])

  const flushPersist = useCallback(() => {
    debouncedPersist.cancel?.()
    const slideContent = selectedSlideRef.current?.slide?.content
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
  }
}
