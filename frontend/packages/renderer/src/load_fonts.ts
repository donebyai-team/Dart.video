// src/styles/loadFonts.ts

import { delayRender, continueRender } from 'remotion'

// Every font available in the editor dropdown
export const SUPPORTED_FONTS = [
  // Sans-serif
  'Inter',
  'DM Sans',
  'Poppins',
  'Montserrat',
  'Manrope',
  'Syne',
  'Space Grotesk',
  'Outfit',
  // Serif
  'Playfair Display',
  'Lora',
  'Fraunces',
  // Mono
  'JetBrains Mono',
  'Space Mono',
  'DM Mono',
]

export function loadAllFonts(): void {
  SUPPORTED_FONTS.forEach(fontName => {
    const handle = delayRender(`Loading font: ${fontName}`)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${
      fontName.replace(/ /g, '+')
    }:wght@400;500;600&display=swap`

    link.onload = () => continueRender(handle)
    link.onerror = () => continueRender(handle)

    document.head.appendChild(link)
  })
}