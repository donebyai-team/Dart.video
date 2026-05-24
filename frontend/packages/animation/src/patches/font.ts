import { FONT_WEIGHT_VALUES } from "../tokens";

const FONT_WEIGHTS = Object.values(FONT_WEIGHT_VALUES)
  .filter((weight): weight is number => typeof weight === 'number')
  .sort((a, b) => a - b);
const fontLoadCache = new Map<string, Promise<void>>();

export function getPrimaryFontFamily(fontFamily: string): string {
  const [primary = ''] = fontFamily.split(',');
  return primary.trim().replace(/^['"]|['"]$/g, '');
}

function isSystemFont(fontName: string): boolean {
  const normalized = getPrimaryFontFamily(fontName).toLowerCase();
  return normalized === 'arial' || normalized === 'helvetica' || normalized.includes('sans-serif') || normalized.includes('serif') || normalized.includes('monospace');
}

async function waitForBrowserFont(fontName: string): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }

  const fontFaceSet = document.fonts;
  const quotedFamily = JSON.stringify(fontName);
  const loadPromises = FONT_WEIGHTS.map((weight) =>
    fontFaceSet.load(`normal ${weight} 16px ${quotedFamily}`).catch(() => undefined)
  );

  await Promise.all(loadPromises);
  await fontFaceSet.ready.catch(() => undefined);
}

export async function waitForFontAvailability(
  fontFamily: string,
  fontWeight?: string | number,
  timeoutMs = 4000,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return true;
  }

  const family = getPrimaryFontFamily(fontFamily);
  if (!family || isSystemFont(family)) {
    return true;
  }

  const weight = fontWeight ?? 400;
  const descriptor = `normal ${weight} 16px ${JSON.stringify(family)}`;
  const fontFaceSet = document.fonts;

  if (fontFaceSet.check(descriptor)) {
    return true;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await fontFaceSet.load(descriptor).catch(() => undefined);
    if (fontFaceSet.check(descriptor)) {
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return fontFaceSet.check(descriptor);
}

export function loadFontViaStylesheet(fontName: string): Promise<void> {
  const normalizedFontName = getPrimaryFontFamily(fontName);
  if (!normalizedFontName || isSystemFont(normalizedFontName)) {
    return Promise.resolve();
  }

  const cachedPromise = fontLoadCache.get(normalizedFontName);
  if (cachedPromise) {
    return cachedPromise;
  }

  const weights = FONT_WEIGHTS.join(';');
  const encodedFont = encodeURIComponent(normalizedFontName).replace(/%20/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encodedFont}:wght@${weights}&display=swap`;

  const promise = new Promise<void>((resolve) => {
    if (typeof document === 'undefined') {
      console.warn('[loadFontViaStylesheet] No document available, skipping font load:', normalizedFontName);
      resolve();
      return;
    }

    // Check if already loaded
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      waitForBrowserFont(normalizedFontName).finally(resolve);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      waitForBrowserFont(normalizedFontName).finally(resolve);
    };
    link.onerror = () => {
      console.warn('[loadFontViaStylesheet] Failed to load font:', normalizedFontName);
      resolve(); // Don't reject, just use fallback
    };

    document.head.appendChild(link);
  });

  fontLoadCache.set(normalizedFontName, promise);
  return promise;
}
