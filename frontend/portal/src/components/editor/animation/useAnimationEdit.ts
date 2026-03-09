import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { RegistryEntry } from '@coasterai/renderer'
import { AnimationSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { JsonObject } from '@bufbuild/protobuf'
import { useVideoStore } from '@/stores/video'
import { debounce } from '@/stores/video/sync'
import { ElementEdit } from '@coasterai/renderer/src/types/ast'

interface UseAnimationEditReturn {
  isAnimationSlide: boolean
  animRegistry: Record<string, RegistryEntry>
  selectedEid: string | null
  setSelectedEid: (eid: string | null) => void
  editStore: Record<string, ElementEdit>
  animEditVersion: number
  applyEdit: (eid: string, patch: Partial<ElementEdit>) => void
  applyEdits: (edits: Record<string, ElementEdit>) => void
  flushPersist: () => void
}

export function useAnimationEdit(): UseAnimationEditReturn {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)

  const content = selectedSlide?.slide?.content
  const isAnimationSlide = content?.case === 'animation'
  const slideId = selectedSlide?.slide?.id

  // ── Registry ────────────────────────────────────────────────────────────────
  // useMemo so it's not recomputed on every render.
  // Runtime guard instead of double-cast to catch schema mismatches early.
  const animRegistry = useMemo<Record<string, RegistryEntry>>(() => {
    if (!isAnimationSlide) return {}
    const config = (content?.value as AnimationSlideContent)?.registry
    if (typeof config !== 'object' || config === null) return {}
    return config as unknown as Record<string, RegistryEntry>
  }, [isAnimationSlide, content])

  // ── Stable ref to latest slide — prevents stale closures in callbacks ───────
  const selectedSlideRef = useRef(selectedSlide)
  useEffect(() => { selectedSlideRef.current = selectedSlide }, [selectedSlide])

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEid, setSelectedEid] = useState<string | null>(null)
  const [editStore, setEditStore] = useState<Record<string, ElementEdit>>({})
  // Ref kept in sync inside the setEditStore updater (runs synchronously), so
  // flushPersist can read the latest value right after applyEdit is called.
  const editStoreRef = useRef<Record<string, ElementEdit>>({})
  const [animEditVersion, setAnimEditVersion] = useState(0)

  // Tracks whether the current editStore value came from loading (not a user edit).
  // Prevents the persist effect from firing a redundant updateSlide on slide switch.
  const isLoadingRef = useRef(false)

  // ── Keep window.__EDIT_STORE__ in sync — single source of truth ─────────────
  useEffect(() => {
    ; (window as any).__EDIT_STORE__ = editStore
  }, [editStore])

  // ── Load saved edits when slide changes ─────────────────────────────────────
  useEffect(() => {
    isLoadingRef.current = true
    setSelectedEid(null)
    setAnimEditVersion(0)

    const savedEdits = isAnimationSlide
      ? ((content?.value as AnimationSlideContent)?.edits ?? {}) as Record<string, ElementEdit>
      : {}

    editStoreRef.current = savedEdits
    setEditStore(savedEdits)
  }, [slideId]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyEdits = useCallback((edits: Record<string, ElementEdit>) => {
    setEditStore(edits)
    setAnimEditVersion(v => v + 1)
  }, [])


  // ── Apply an edit ────────────────────────────────────────────────────────────
  /*
Key merge decisions:
```
style     → merged (add/override individual props)
ranges    → merged (add/override individual props)
springs   → merged (add/override individual props)
counter   → merged (start and end can be patched independently)
transform → merged (translateX can be patched without touching translateY)
text      → replaced (whole string, no merge concept)
words     → replaced (whole array, no merge concept)
asset     → replaced
icon      → replaced
  */
  const applyEdit = useCallback((eid: string, patch: Partial<ElementEdit>) => {
    console.log('applying edits', eid, patch)
    setEditStore(prev => {
      const existing = prev[eid] ?? {}
      const next = {
        ...prev,
        [eid]: {
          ...existing,
          ...(patch.style ? { style: { ...(existing.style ?? {}), ...patch.style } } : {}),
          ...(patch.text !== undefined ? { text: patch.text } : {}),
          ...(patch.asset !== undefined ? { asset: patch.asset } : {}),
          ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
          ...(patch.words !== undefined ? { words: patch.words } : {}),
          ...(patch.ranges ? { ranges: { ...(existing.ranges ?? {}), ...patch.ranges } } : {}),
          ...(patch.springs ? { springs: { ...(existing.springs ?? {}), ...patch.springs } } : {}),
          ...(patch.counter ? { counter: { ...(existing.counter ?? {}), ...patch.counter } } : {}),
          ...(patch.transform ? { transform: { ...(existing.transform ?? {}), ...patch.transform } } : {}),
        },
      }
      editStoreRef.current = next
      return next
    })
    setAnimEditVersion(v => v + 1)
  }, [])

  // ── Debounced persist ────────────────────────────────────────────────────────
  // Debounced so rapid edits (e.g. typing) don't fire an API call on every keystroke.
  // useMemo so the debounced function is stable across renders.
  const debouncedPersist = useMemo(
    () =>
      debounce((edits: Record<string, ElementEdit>) => {
        const slideContent = selectedSlideRef.current?.slide?.content
        if (slideContent?.case !== 'animation') return
        updateSlide({
          content: {
            case: 'animation',
            value: {
              ...slideContent.value,
              edits: edits as unknown as JsonObject,
            },
          },
        })
      }, 600),
    [updateSlide]
  )

  // Cancel any in-flight debounced persist when the component unmounts
  useEffect(() => () => debouncedPersist?.cancel?.(), [debouncedPersist])

  // ── Trigger persist when editStore changes ───────────────────────────────────
  useEffect(() => {
    if (!isAnimationSlide) return

    // Skip the run caused by loading saved edits on slide switch
    if (isLoadingRef.current) {
      isLoadingRef.current = false
      return
    }

    debouncedPersist(editStore)
  }, [editStore, isAnimationSlide, debouncedPersist])

  const flushPersist = useCallback(() => {
    debouncedPersist.cancel?.()
    const slideContent = selectedSlideRef.current?.slide?.content
    if (slideContent?.case !== 'animation') return
    updateSlide({
      content: {
        case: 'animation',
        value: { ...slideContent.value, edits: editStoreRef.current as unknown as JsonObject },
      },
    })
  }, [debouncedPersist, updateSlide])

  return {
    isAnimationSlide,
    animRegistry,
    selectedEid,
    setSelectedEid,
    editStore,
    animEditVersion,
    applyEdit,
    flushPersist,
    applyEdits,
  }
}