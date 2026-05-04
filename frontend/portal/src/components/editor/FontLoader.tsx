'use client'

import { useEffect } from 'react'
import { loadFonts } from '@coasterai/renderer'

// Default fonts to load on editor mount
// These are the fallback fonts used in ThemeContext
const DEFAULT_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Roboto Mono',
  'Source Code Pro',
  'IBM Plex Mono',
  'Merriweather',
  'Lora',
  'Noto Serif',
]

/**
 * Loads default fallback fonts when the editor mounts
 * This ensures fonts are available even when no brand font is set
 */
export function FontLoader() {
  useEffect(() => {
    console.log('[FontLoader] Loading default fonts for editor')
    loadFonts(DEFAULT_FONTS)
  }, [])

  return null
}
