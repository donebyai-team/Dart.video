import { StyleConfig } from './types';
import { STYLE_PRESETS } from './presets';
import { BrandTheme } from '../theme/types';

export type { BrandTheme };

/**
 * Resolves a style preset by ID.
 * Style = structural rules (motion, shape, stroke, surface, type).
 * Brand colors live in ThemeContext, not in the returned StyleConfig.
 */
export function resolveStyle(styleId: string, _brand?: BrandTheme): StyleConfig {
  const preset = STYLE_PRESETS[styleId];
  if (!preset) {
    throw new Error(`Unknown style: "${styleId}". Available styles: ${Object.keys(STYLE_PRESETS).join(', ')}`);
  }
  return preset;
}
