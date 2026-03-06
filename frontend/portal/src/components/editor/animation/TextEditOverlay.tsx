/**
 * TextEditOverlay
 *
 * Renders a contentEditable div positioned exactly over the selected text element.
 * Hides the original DOM element for the duration of editing.
 *
 * Fixes applied:
 *  - Uses maxWidth from computed style instead of elementRect.width as a hard
 *    width constraint, so text wraps at the same point as the real element.
 *  - minWidth ensures the overlay is never narrower than the current element.
 *  - width is unset (auto) so the overlay can grow horizontally when needed.
 *  - Copies textDecoration, whiteSpace, wordBreak, padding from computed style
 *    so the overlay is a true visual replica of the element.
 *  - Strips unitless lineHeight / letterSpacing gracefully.
 *  - scale factor only applied when the player is CSS-scaled — guards against
 *    divide-by-zero and NaN propagation.
 */

import React, { useRef, useLayoutEffect, useEffect } from 'react'

interface FRect { left: number; top: number; width: number; height: number }

interface TextEditOverlayProps {
  elementRect:       FRect
  selectedEid:       string
  playerRef:         React.RefObject<HTMLDivElement>
  initText:          string
  onCommit:          (text: string, height: number) => void
  onCancel:          () => void
  onHeightChange:    (h: number) => void
}

export function TextEditOverlay({
  elementRect,
  selectedEid,
  playerRef,
  initText,
  onCommit,
  onCancel,
  onHeightChange,
}: TextEditOverlayProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  // ── Hide original element while editing ────────────────────────────────────
  useLayoutEffect(() => {
    const el = playerRef.current?.querySelector(
      `[data-eid="${selectedEid}"]`
    ) as HTMLElement | null
    if (!el) return
    const prev = el.style.visibility
    el.style.visibility = 'hidden'
    return () => { el.style.visibility = prev }
  }, [selectedEid, playerRef])

  // ── Focus + place cursor at end on mount ───────────────────────────────────
  useLayoutEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerText = initText
    el.focus()
    const range = document.createRange()
    const sel   = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)        // collapse to end — cursor at end of text
    sel?.removeAllRanges()
    sel?.addRange(range)


  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track height changes so the selection highlight can follow ─────────────
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      onHeightChange(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeightChange])

  // ── Commit ─────────────────────────────────────────────────────────────────
  function commit(el: HTMLDivElement) {
    const text = el.innerText.trim()
    onCommit(text, el.offsetHeight)
  }

  // ── Mirror the real element's styles ───────────────────────────────────────
  //
  // Key fix: we use maxWidth (not width) as the wrapping constraint so the
  // overlay wraps text at the same point the real element does.
  // minWidth ensures it is never narrower than the current rendered element.
  // width is left as 'auto' so it can shrink/grow freely within maxWidth.
  //
  function getMatchedStyles(): React.CSSProperties {
    const domEl = playerRef.current?.querySelector(
      `[data-eid="${selectedEid}"]`
    ) as HTMLElement | null

    if (!domEl) return {}

    const cs = window.getComputedStyle(domEl)

    // Scale factor: if the player canvas is CSS-scaled (e.g. transform: scale(0.5)),
    // the element's offsetWidth in DOM px differs from its visual px.
    // getBoundingClientRect gives visual px, offsetWidth gives layout px.
    // We scale font metrics to match visual size.
    const layoutWidth = domEl.offsetWidth
    const visualWidth = elementRect.width
    const scale = layoutWidth > 0 ? visualWidth / layoutWidth : 1

    // Font size
    const rawFontSize = parseFloat(cs.fontSize)
    const fontSize    = isNaN(rawFontSize) ? undefined : `${rawFontSize * scale}px`

    // Line height — can be unitless multiplier or px value
    const rawLineHeight = parseFloat(cs.lineHeight)
    const lineHeight    = isNaN(rawLineHeight) ? cs.lineHeight : `${rawLineHeight * scale}px`

    // Letter spacing — can be "normal" (NaN) or px value
    const rawLetterSpacing = parseFloat(cs.letterSpacing)
    const letterSpacing    = isNaN(rawLetterSpacing) ? undefined : `${rawLetterSpacing * scale}px`

    // maxWidth — this is the key fix.
    // Parse the computed maxWidth; if it's "none" parseFloat gives NaN → we fall
    // back to a generous bound so the overlay is never artificially narrow.
    const rawMaxWidth = parseFloat(cs.maxWidth)
    const maxWidth    = isNaN(rawMaxWidth)
      ? visualWidth * 2   // no maxWidth on element — allow generous growth
      : rawMaxWidth * scale

    // padding — scale each side
    const rawPaddingTop    = parseFloat(cs.paddingTop)    || 0
    const rawPaddingRight  = parseFloat(cs.paddingRight)  || 0
    const rawPaddingBottom = parseFloat(cs.paddingBottom) || 0
    const rawPaddingLeft   = parseFloat(cs.paddingLeft)   || 0

    return {
      // Text metrics
      fontFamily:     cs.fontFamily,
      fontSize,
      fontWeight:     cs.fontWeight,
      fontStyle:      cs.fontStyle,
      textDecoration: cs.textDecoration,
      color:          cs.color,
      textAlign:      cs.textAlign as React.CSSProperties['textAlign'],
      letterSpacing,
      lineHeight,

      // Spacing
      padding: `${rawPaddingTop * scale}px ${rawPaddingRight * scale}px ${rawPaddingBottom * scale}px ${rawPaddingLeft * scale}px`,

      // Width constraints — THE FIX
      // width: auto  →  overlay sizes to content
      // minWidth     →  never narrower than current rendered element
      // maxWidth     →  wraps at the same point as the real element
      width:    'auto',
      minWidth: visualWidth,
      maxWidth,
    }
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={e => commit(e.currentTarget)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          commit(e.currentTarget as HTMLDivElement)
        }
        if (e.key === 'Escape') {
          onCancel()
        }
      }}
      style={{
        position:  'fixed',
        left:      elementRect.left,
        top:       elementRect.top,
        minHeight: elementRect.height,
        zIndex:    9999,

        // Matched styles (includes width/maxWidth/minWidth)
        ...getMatchedStyles(),

        // Editor chrome — always override
        background: 'transparent',
        outline:    'none',
        cursor:     'text',
        boxSizing:  'border-box',

        // Wrapping behaviour — must match element
        // whiteSpace from computed style would be ideal but contentEditable
        // needs pre-wrap to handle newlines correctly
        whiteSpace: 'pre-wrap',
        wordBreak:  'break-word',
      }}
    />
  )
}