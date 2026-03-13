import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PrimitiveElement, PrimitiveIdRegistry, PatchOverlay } from '@coasterai/renderer'
import { AnimationSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { JsonObject } from '@bufbuild/protobuf'
import { useVideoStore } from '@/stores/video'
import { debounce } from '@/stores/video/sync'

interface UseAnimationEditReturn {
  isAnimationSlide: boolean
  /** Registry of primitive elements: id → PrimitiveElement */
  primitiveRegistry: Record<string, PrimitiveElement>
  selectedEid: string | null
  setSelectedEid: (eid: string | null) => void
  /** PatchOverlay: element edits keyed by primitive ID */
  editOverlay: PatchOverlay
  animEditVersion: number
  /** Apply a value patch to a primitive prop */
  applyValuePatch: (id: string, prop: string, value: unknown) => void
  /** Apply multiple value patches at once */
  applyValuePatches: (id: string, values: Record<string, unknown>) => void
  /** Apply a style override */
  applyStyleOverride: (id: string, style: Record<string, string | number>) => void
  /** Replace the entire overlay (e.g. after reconciliation) */
  setOverlay: (overlay: PatchOverlay) => void
  flushPersist: () => void
}

export function useAnimationEdit(): UseAnimationEditReturn {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)

  const content = selectedSlide?.slide?.content
  const isAnimationSlide = content?.case === 'animation'
  const slideId = selectedSlide?.slide?.id

  // ── Registry ────────────────────────────────────────────────────────────────
  const primitiveRegistry = useMemo<Record<string, PrimitiveElement>>(() => {
    if (!isAnimationSlide) return {}
    const raw = (content?.value as AnimationSlideContent)?.registry
    if (typeof raw !== 'object' || raw === null) return {}
    // The registry is now PrimitiveIdRegistry.elements
    const reg = raw as unknown as PrimitiveIdRegistry | Record<string, PrimitiveElement>
    if ('elements' in reg) return (reg as PrimitiveIdRegistry).elements
    return reg as Record<string, PrimitiveElement>
  }, [isAnimationSlide, content])

  // ── Stable ref to latest slide — prevents stale closures in callbacks ───────
  const selectedSlideRef = useRef(selectedSlide)
  useEffect(() => { selectedSlideRef.current = selectedSlide }, [selectedSlide])

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEid, setSelectedEid] = useState<string | null>(null)
  const [editOverlay, setEditOverlay] = useState<PatchOverlay>({})
  const editOverlayRef = useRef<PatchOverlay>({})
  const [animEditVersion, setAnimEditVersion] = useState(0)

  const isLoadingRef = useRef(false)

  // ── Keep window.__PATCH_OVERLAY__ in sync ──────────────────────────────────
  useEffect(() => {
    ;(window as any).__PATCH_OVERLAY__ = editOverlay
  }, [editOverlay])

  // ── Load saved edits when slide changes ───────────────────────────────────
  useEffect(() => {
    isLoadingRef.current = true
    setSelectedEid(null)
    setAnimEditVersion(0)

    const savedEdits = isAnimationSlide
      ? ((content?.value as AnimationSlideContent)?.edits ?? {}) as PatchOverlay
      : {}

    editOverlayRef.current = savedEdits
    setEditOverlay(savedEdits)
  }, [slideId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply a single value patch ────────────────────────────────────────────
  const applyValuePatch = useCallback((id: string, prop: string, value: unknown) => {
    setEditOverlay(prev => {
      const entry = prev[id] ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: {
          ...entry,
          value: { ...(entry.value ?? {}), [prop]: value },
        },
      }
      editOverlayRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Apply multiple value patches at once ──────────────────────────────────
  const applyValuePatches = useCallback((id: string, values: Record<string, unknown>) => {
    setEditOverlay(prev => {
      const entry = prev[id] ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: {
          ...entry,
          value: { ...(entry.value ?? {}), ...values },
        },
      }
      editOverlayRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Apply style override ──────────────────────────────────────────────────
  const applyStyleOverride = useCallback((id: string, style: Record<string, string | number>) => {
    setEditOverlay(prev => {
      const entry = prev[id] ?? {}
      const next: PatchOverlay = {
        ...prev,
        [id]: {
          ...entry,
          styleOverride: { ...(entry.styleOverride ?? {}), ...style },
        },
      }
      editOverlayRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Replace entire overlay ────────────────────────────────────────────────
  const setOverlay = useCallback((overlay: PatchOverlay) => {
    editOverlayRef.current = overlay
    setEditOverlay(overlay)
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Debounced persist ────────────────────────────────────────────────────────
  const debouncedPersist = useMemo(
    () =>
      debounce((overlay: PatchOverlay) => {
        const slideContent = selectedSlideRef.current?.slide?.content
        if (slideContent?.case !== 'animation') return
        updateSlide({
          content: {
            case: 'animation',
            value: {
              ...slideContent.value,
              edits: overlay as unknown as JsonObject,
            },
          },
        })
      }, 600),
    [updateSlide]
  )

  useEffect(() => () => debouncedPersist?.cancel?.(), [debouncedPersist])

  useEffect(() => {
    if (!isAnimationSlide) return
    if (isLoadingRef.current) {
      isLoadingRef.current = false
      return
    }
    debouncedPersist(editOverlay)
  }, [editOverlay, isAnimationSlide, debouncedPersist])

  const flushPersist = useCallback(() => {
    debouncedPersist.cancel?.()
    const slideContent = selectedSlideRef.current?.slide?.content
    if (slideContent?.case !== 'animation') return
    updateSlide({
      content: {
        case: 'animation',
        value: { ...slideContent.value, edits: editOverlayRef.current as unknown as JsonObject },
      },
    })
  }, [debouncedPersist, updateSlide])

  return {
    isAnimationSlide,
    primitiveRegistry,
    selectedEid,
    setSelectedEid,
    editOverlay,
    animEditVersion,
    applyValuePatch,
    applyValuePatches,
    applyStyleOverride,
    setOverlay,
    flushPersist,
  }
}
