import React, { createContext, useContext, useMemo } from 'react';
import { BrandTheme, ResolvedTheme } from './types';
import { derivePalette } from './derive';
import { DEFAULT_BRAND_THEME } from './defaults';

const SANS_FALLBACK  = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO_FALLBACK  = 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", Times, serif';

function resolveFonts(brand: BrandTheme): Pick<ResolvedTheme, 'font' | 'fontMono' | 'fontSerif'> {
  return {
    font:      brand.font      ? `${brand.font}, ${SANS_FALLBACK}`  : SANS_FALLBACK,
    fontMono:  brand.fontMono  ? `${brand.fontMono}, ${MONO_FALLBACK}`  : MONO_FALLBACK,
    fontSerif: brand.fontSerif ? `${brand.fontSerif}, ${SERIF_FALLBACK}` : SERIF_FALLBACK,
  };
}

const DEFAULT_RESOLVED: ResolvedTheme = {
  colors: derivePalette(DEFAULT_BRAND_THEME),
  ...resolveFonts(DEFAULT_BRAND_THEME),
};

const ThemeContext = createContext<ResolvedTheme>(DEFAULT_RESOLVED);

export interface ThemeProviderProps {
  theme: BrandTheme;
  children: React.ReactNode;
}

/**
 * Accepts a BrandTheme, derives the full ResolvedTheme (26 color slots + font stacks),
 * and provides it to all components via useTheme().
 * Set once per project — wraps the outermost composition root.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): React.ReactElement {
  const resolved = useMemo<ResolvedTheme>(() => ({
    colors: derivePalette(theme),
    ...resolveFonts(theme),
    ...theme
  }), [theme]);

  return (
    <ThemeContext.Provider value={resolved}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Returns the fully resolved theme (26 color slots + font stacks).
 * Falls back to a derived default if no ThemeProvider is present.
 */
export function useTheme(): ResolvedTheme {
  return useContext(ThemeContext);
}
