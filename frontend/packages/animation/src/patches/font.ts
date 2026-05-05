import { FONT_WEIGHT_VALUES } from "../tokens";

const FONT_WEIGHTS = Object.values(FONT_WEIGHT_VALUES)
  .filter((weight): weight is number => typeof weight === 'number')
  .sort((a, b) => a - b);

export function loadFontViaStylesheet(fontName: string): Promise<void> {
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