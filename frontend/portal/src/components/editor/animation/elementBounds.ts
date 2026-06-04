export interface ElementRect {
  left: number
  top: number
  width: number
  height: number
}

 function rectFromDomRect(rect: DOMRect): ElementRect {
   return {
     left: rect.left,
     top: rect.top,
     width: rect.width,
     height: rect.height,
   }
 }

function getExpectedTextHeight(el: HTMLElement): number {
  const computedStyle = window.getComputedStyle(el)
  const fontSize = Number.parseFloat(computedStyle.fontSize || '')
  const lineHeight = Number.parseFloat(computedStyle.lineHeight || '')

  if (Number.isFinite(lineHeight)) return lineHeight
  if (Number.isFinite(fontSize) && fontSize > 0) return fontSize * 1.2
  return 0
}

 function getTextContentRect(el: HTMLElement): ElementRect | null {
   const range = document.createRange()
   range.selectNodeContents(el)
   const rect = range.getBoundingClientRect()

   if (rect.width <= 0 || rect.height <= 0) return null
   return rectFromDomRect(rect)
 }

export function getNormalizedElementRect(el: HTMLElement): ElementRect {
  const rect = el.getBoundingClientRect()
  const normalizedRect = rectFromDomRect(rect)

  const isInlineTextElement = el.tagName === 'SPAN' || el.tagName === 'P'
  if (!isInlineTextElement) return normalizedRect

  const textContentRect = getTextContentRect(el)
  if (textContentRect) return textContentRect

  const nextWidth = Math.max(normalizedRect.width, el.offsetWidth, el.scrollWidth)
  const nextHeight = Math.max(
    normalizedRect.height,
    el.offsetHeight,
    el.scrollHeight,
    getExpectedTextHeight(el),
  )

  return {
    left: normalizedRect.left,
    top: normalizedRect.top,
    width: nextWidth,
    height: nextHeight,
  }
}
