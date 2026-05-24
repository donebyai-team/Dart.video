import React, { createContext, useContext, useMemo } from 'react';
import { BrandTheme, ResolvedTheme } from './types';

// Fallback to popular Google Fonts from our supported list
const SANS_FALLBACK  = 'Inter, Roboto, "Open Sans", sans-serif';
const MONO_FALLBACK  = '"Roboto Mono", "Source Code Pro", "IBM Plex Mono", monospace';
const SERIF_FALLBACK = 'Merriweather, Lora, "Noto Serif", serif';

function resolveFonts(brand: BrandTheme): Pick<ResolvedTheme, 'font' | 'fontMono' | 'fontSerif'> {
  const resolved = {
    font:      brand.font      ? `${brand.font}, ${SANS_FALLBACK}`  : SANS_FALLBACK,
    fontMono:  brand.fontMono  ? `${brand.fontMono}, ${MONO_FALLBACK}`  : MONO_FALLBACK,
    fontSerif: brand.fontSerif ? `${brand.fontSerif}, ${SERIF_FALLBACK}` : SERIF_FALLBACK,
  };
  return resolved;
}

const ThemeContext = createContext<ResolvedTheme | null>(null);

export interface ThemeProviderProps {
  theme: BrandTheme;
  children: React.ReactNode;
}

/**
 * Accepts a BrandTheme and exposes its colors directly to all children.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): React.ReactElement {
  const resolved = useMemo<ResolvedTheme>(() => {
    return {
      ...theme,
      colors: {
        foreground: theme.text,
        primary: theme.primary,
        secondary: theme.secondary,
      },
      ...resolveFonts(theme),
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={resolved}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Returns the current brand theme.
 */
export function useTheme(): ResolvedTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
