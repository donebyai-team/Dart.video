// src/styles/loadFonts.ts

import { delayRender, continueRender } from 'remotion'

// Every font available in the editor dropdown
export const SUPPORTED_FONTS =
  [
    'Abel',
    'Anton',
    'Archivo',
    'Arimo',
    'Arvo',
    'Asap',
    'Assistant',
    'Barlow',
    'Barlow Condensed',
    'Barlow Semi Condensed',
    'Bebas Neue',
    'Bitter',
    'Cabin',
    'Cairo',
    'Caveat',
    'Chakra Petch',
    'Comfortaa',
    'Cormorant Garamond',
    'Crimson Text',
    'DM Sans',
    'Dancing Script',
    'Dosis',
    'EB Garamond',
    'Exo 2',
    'Figtree',
    'Fira Sans',
    'Fira Sans Condensed',
    'Fjalla One',
    'Heebo',
    'Hind',
    'Hind Siliguri',
    'IBM Plex Mono',
    'IBM Plex Sans',
    'Inconsolata',
    'Inter',
    'Josefin Sans',
    'Jost',
    'Kanit',
    'Karla',
    'Lato',
    'Lexend',
    'Libre Baskerville',
    'Libre Franklin',
    'Lobster',
    'Lora',
    'M PLUS Rounded 1c',
    'Manrope',
    'Maven Pro',
    'Merriweather',
    'Montserrat',
    'Mukta',
    'Mulish',
    'Nanum Gothic',
    'Noto Color Emoji',
    'Noto Sans',
    'Noto Sans Arabic',
    'Noto Sans HK',
    'Noto Sans JP',
    'Noto Sans KR',
    'Noto Sans SC',
    'Noto Sans TC',
    'Noto Serif',
    'Noto Serif JP',
    'Nunito',
    'Nunito Sans',
    'Open Sans',
    'Oswald',
    'Outfit',
    'Overpass',
    'Oxygen',
    'PT Sans',
    'PT Sans Narrow',
    'PT Serif',
    'Pacifico',
    'Play',
    'Playfair Display',
    'Poppins',
    'Prompt',
    'Public Sans',
    'Quicksand',
    'Rajdhani',
    'Raleway',
    'Red Hat Display',
    'Roboto',
    'Roboto Condensed',
    'Roboto Mono',
    'Roboto Slab',
    'Rubik',
    'Shadows Into Light',
    'Signika Negative',
    'Slabo 27px',
    'Source Code Pro',
    'Source Sans 3',
    'Space Grotesk',
    'Teko',
    'Titillium Web',
    'Ubuntu',
    'Varela Round',
    'Work Sans',
    'Zilla Slab'
  ]

const FONT_WEIGHTS = ['400', '500', '600', '700', '800']
const requestedFontStylesheets = new Map<string, Promise<void>>()

interface LoadFontsOptions {
  waitForFonts?: boolean
}

function getFontStylesheetHref(fontName: string): string {
  return `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@${FONT_WEIGHTS.join(
    ';'
  )}&display=swap`
}

function requestFontStylesheet(fontName: string): Promise<void> {
  const existingRequest = requestedFontStylesheets.get(fontName)

  if (existingRequest) {
    return existingRequest
  }

  const request = new Promise<void>(resolve => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = getFontStylesheetHref(fontName)
    link.onload = () => resolve()
    link.onerror = () => resolve()

    document.head.appendChild(link)
  })

  requestedFontStylesheets.set(fontName, request)
  return request
}

async function waitForFont(fontName: string): Promise<void> {
  await requestFontStylesheet(fontName)

  if (typeof document === 'undefined' || !document.fonts) {
    return
  }

  await Promise.all(FONT_WEIGHTS.map(weight => document.fonts.load(`${weight} 160px "${fontName}"`)))
}

export function loadFonts(fontNames: string[], options: LoadFontsOptions = {}): void {
  fontNames.forEach(fontName => {
    const normalizedFontName = fontName.trim()

    if (!normalizedFontName) {
      return
    }

    if (!options.waitForFonts) {
      requestFontStylesheet(normalizedFontName)
      return
    }

    const handle = delayRender(`Loading font: ${normalizedFontName}`)

    waitForFont(normalizedFontName)
      .catch(() => {
        // Fall through and continue render even if the browser cannot confirm the face.
      })
      .finally(() => continueRender(handle))
  })
}

// Load fonts while rendering, while editing already available in browser
export function loadAllFonts(): void {
  loadFonts(SUPPORTED_FONTS, { waitForFonts: true })
}
