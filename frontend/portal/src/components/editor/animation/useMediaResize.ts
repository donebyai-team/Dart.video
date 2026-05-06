import { useRef } from 'react'
import type React from 'react'

interface ElementRect {
  left: number
  top: number
  width: number
  height: number
}

interface MediaResizeState {
  pointerId: number
  elementId: string
  startClientX: number
  startClientY: number
  initialWidth: number
  initialHeight: number
  pendingWidth: number
  pendingHeight: number
  aspectRatio: number
  scaleX: number
  scaleY: number
  previewEl: HTMLElement
  previewContentEl: HTMLElement | null
}

interface UseMediaResizeParams {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  isMediaComponent: (id: string) => boolean
  onValuePatch: (id: string, prop: string, value: unknown) => void
  setElementRect: (rect: ElementRect) => void
}

interface UseMediaResizeResult {
  mediaResizeStateRef: React.MutableRefObject<MediaResizeState | null>
  handleMediaResizePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  handleMediaResizePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  handleMediaResizePointerEnd: (e: React.PointerEvent<HTMLDivElement>) => void
}

const MIN_MEDIA_SIZE = 40

function clampSizeToMinimum(width: number, height: number, aspectRatio: number) {
  let nextWidth = width
  let nextHeight = height

  if (nextWidth < MIN_MEDIA_SIZE) {
    nextWidth = MIN_MEDIA_SIZE
    nextHeight = Math.max(MIN_MEDIA_SIZE, Math.round(nextWidth / aspectRatio))
  }

  if (nextHeight < MIN_MEDIA_SIZE) {
    nextHeight = MIN_MEDIA_SIZE
    nextWidth = Math.max(MIN_MEDIA_SIZE, Math.round(nextHeight * aspectRatio))
  }

  return { width: nextWidth, height: nextHeight }
}

export function useMediaResize({
  playerRef,
  selectedEid,
  isMediaComponent,
  onValuePatch,
  setElementRect,
}: UseMediaResizeParams): UseMediaResizeResult {
  const mediaResizeStateRef = useRef<MediaResizeState | null>(null)

  function handleMediaResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!selectedEid || !isMediaComponent(selectedEid)) return

    const previewEl = playerRef.current?.querySelector(`[id="${selectedEid}"]`) as HTMLElement | null
    if (!previewEl) return

    e.preventDefault()
    e.stopPropagation()

    const previewRect = previewEl.getBoundingClientRect()
    const initialWidth = previewEl.offsetWidth || previewRect.width
    const initialHeight = previewEl.offsetHeight || previewRect.height
    const previewContentEl =
      previewEl.firstElementChild instanceof HTMLElement
        ? previewEl.firstElementChild
        : null
    const aspectRatio =
      initialWidth > 0 && initialHeight > 0 ? initialWidth / initialHeight : 1

    mediaResizeStateRef.current = {
      pointerId: e.pointerId,
      elementId: selectedEid,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialWidth,
      initialHeight,
      pendingWidth: initialWidth,
      pendingHeight: initialHeight,
      aspectRatio,
      scaleX: previewRect.width > 0 ? initialWidth / previewRect.width : 1,
      scaleY: previewRect.height > 0 ? initialHeight / previewRect.height : 1,
      previewEl,
      previewContentEl,
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleMediaResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const resizeState = mediaResizeStateRef.current
    if (!resizeState || resizeState.pointerId !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    const deltaX = (e.clientX - resizeState.startClientX) * resizeState.scaleX
    const deltaY = (e.clientY - resizeState.startClientY) * resizeState.scaleY

    // Use the stronger axis movement, but always convert back into the
    // original width/height ratio so the media box stays proportional.
    const widthFromHorizontalDrag = resizeState.initialWidth + deltaX
    const widthFromVerticalDrag =
      resizeState.initialWidth + deltaY * resizeState.aspectRatio
    const rawWidth =
      Math.abs(deltaX) >= Math.abs(deltaY * resizeState.aspectRatio)
        ? widthFromHorizontalDrag
        : widthFromVerticalDrag

    const unclampedWidth = Math.round(rawWidth)
    const unclampedHeight = Math.round(unclampedWidth / resizeState.aspectRatio)
    const nextSize = clampSizeToMinimum(
      unclampedWidth,
      unclampedHeight,
      resizeState.aspectRatio,
    )

    resizeState.pendingWidth = nextSize.width
    resizeState.pendingHeight = nextSize.height
    resizeState.previewEl.style.width = `${nextSize.width}px`
    resizeState.previewEl.style.height = `${nextSize.height}px`
    if (resizeState.previewContentEl) {
      resizeState.previewContentEl.style.width = `${nextSize.width}px`
      resizeState.previewContentEl.style.height = `${nextSize.height}px`
    }

    const nextRect = resizeState.previewEl.getBoundingClientRect()
    setElementRect({
      left: nextRect.left,
      top: nextRect.top,
      width: nextRect.width,
      height: nextRect.height,
    })
  }

  function handleMediaResizePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const resizeState = mediaResizeStateRef.current
    if (!resizeState || resizeState.pointerId !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    onValuePatch(resizeState.elementId, 'width', resizeState.pendingWidth)
    onValuePatch(resizeState.elementId, 'height', resizeState.pendingHeight)
    mediaResizeStateRef.current = null

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return {
    mediaResizeStateRef,
    handleMediaResizePointerDown,
    handleMediaResizePointerMove,
    handleMediaResizePointerEnd,
  }
}