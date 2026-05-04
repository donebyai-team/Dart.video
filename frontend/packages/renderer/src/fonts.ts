import { getAvailableFonts } from '@remotion/google-fonts';
import { FONT_WEIGHT_VALUES } from '@coasterai/animation';

interface FontLoader {
  fontFamily: string;
  loadFont: (style?: string, options?: { weights?: string[]; subsets?: string[] }) => {
    fontFamily: string;
    waitUntilDone: () => Promise<void>;
  };
}

const fontCache = new Map<string, FontLoader>();

// Use the same font weights as defined in animation package
const FONT_WEIGHTS = Object.values(FONT_WEIGHT_VALUES)
  .filter((weight): weight is number => typeof weight === 'number')
  .sort((a, b) => a - b);

/**
 * Fallback font loader for browser/editor environment
 * Uses Google Fonts API directly via <link> tag
 */
function loadFontViaStylesheet(fontName: string): Promise<void> {
  const weights = FONT_WEIGHTS.join(';');
  const encodedFont = encodeURIComponent(fontName).replace(/%20/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encodedFont}:wght@${weights}&display=swap`;

  return new Promise<void>((resolve) => {
    if (typeof document === 'undefined') {
      console.warn('[loadFontViaStylesheet] No document available, skipping font load:', fontName);
      resolve();
      return;
    }

    // Check if already loaded
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn('[loadFontViaStylesheet] Failed to load font:', fontName);
      resolve(); // Don't reject, just use fallback
    };

    document.head.appendChild(link);
  });
}

/**
 * Unified font loader that works in both editor and rendering environments
 * - In rendering: Uses Remotion's font loader (works in cloud)
 * - In editor: Falls back to Google Fonts API via stylesheet
 */
export async function loadRemotionFont(fontName: string, useRemotionLoader = true): Promise<string> {
  if (!fontName) {
    console.warn('[loadFont] No font name provided');
    return 'Inter'; // Default to Inter from SUPPORTED_FONTS
  }

  const normalizedFontName = fontName.trim();

  if (fontCache.has(normalizedFontName)) {
    const cached = fontCache.get(normalizedFontName)!;
    return cached.fontFamily;
  }

  // Try Remotion loader first (for rendering)
  if (useRemotionLoader) {
    try {
      const availableFonts = getAvailableFonts();
      const fontInfo = availableFonts.find(
        (f) => f.fontFamily === normalizedFontName || f.importName === normalizedFontName
      );

      if (!fontInfo) {
        console.warn('[loadFont] Font not available in @remotion/google-fonts, using stylesheet fallback:', normalizedFontName);
        await loadFontViaStylesheet(normalizedFontName);
        return normalizedFontName;
      }


      const fontModule = await import(`@remotion/google-fonts/${fontInfo.importName}`);
      const loader = fontModule.loadFont('normal', {
        weights: FONT_WEIGHTS.map(w => String(w)),
        subsets: ['latin'],
      });

      fontCache.set(normalizedFontName, {
        fontFamily: loader.fontFamily,
        loadFont: fontModule.loadFont,
      });

      await loader.waitUntilDone();
      return loader.fontFamily;
    } catch (error) {
      console.warn('[loadFont] Remotion loader failed, falling back to stylesheet:', {
        fontName: normalizedFontName,
        error: error instanceof Error ? error.message : String(error),
      });
      await loadFontViaStylesheet(normalizedFontName);
      return normalizedFontName;
    }
  } else {
    // Direct stylesheet loading for editor
    await loadFontViaStylesheet(normalizedFontName);
    return normalizedFontName;
  }
}

// System fonts that don't need loading
const SYSTEM_FONTS = ['Arial', 'Helvetica'];

/**
 * Load multiple fonts (for editor font picker)
 */
export async function loadFonts(fontNames: string[], waitForLoad = false): Promise<void> {
  // Filter out system fonts - they're already available
  const fontsToLoad = fontNames.filter(font => !SYSTEM_FONTS.includes(font));
  const promises = fontsToLoad.map(font => loadRemotionFont(font, false));
  
  if (waitForLoad) {
    await Promise.all(promises);
  } else {
    // Fire and forget for editor
    Promise.all(promises).catch(err => 
      console.warn('[loadFonts] Some fonts failed to load:', err)
    );
  }
}

/**
 * Load all supported fonts for rendering
 * This ensures any font used in text elements will be available
 * Uses delayRender to wait for fonts before rendering starts
 */
export function loadAllFonts(): void {
  // Import delayRender and continueRender from remotion
  import('remotion').then(({ delayRender, continueRender }) => {
    const handle = delayRender('Loading all fonts');
    console.log('[loadAllFonts] Loading', SUPPORTED_FONTS.length, 'fonts');
    
    loadFonts(SUPPORTED_FONTS, true)
      .then(() => {
        console.log('[loadAllFonts] All fonts loaded');
        continueRender(handle);
      })
      .catch((err) => {
        console.error('[loadAllFonts] Failed to load fonts:', err);
        continueRender(handle); // Continue anyway with fallbacks
      });
  });
}

// Every font available in the editor dropdown
// Includes Google Fonts + system fonts (Arial, Helvetica)
export const SUPPORTED_FONTS = [
  'Arial',
  'Helvetica',
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
];
