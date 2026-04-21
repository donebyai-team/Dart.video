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

const FONT_WEIGHTS = ['400', '500', '600', '700', '800']
const requestedFonts = new Set<string>()

// Load fonts while rendering, while editing already available in browser
export function loadAllFonts(): void {
  SUPPORTED_FONTS.forEach(fontName => {
    if (requestedFonts.has(fontName)) {
      return
    }

    requestedFonts.add(fontName)
    const handle = delayRender(`Loading font: ${fontName}`)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${
      fontName.replace(/ /g, '+')
    }:wght@${FONT_WEIGHTS.join(';')}&display=swap`

    link.onload = async () => {
      try {
        await Promise.all(
          FONT_WEIGHTS.map(weight =>
            document.fonts.load(`${weight} 160px "${fontName}"`)
          ),
        )
      } catch {
        // Fall through and continue render even if the browser cannot confirm the face.
      } finally {
        continueRender(handle)
      }
    }
    link.onerror = () => continueRender(handle)

    document.head.appendChild(link)
  })
}
