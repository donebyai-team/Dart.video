import React, { createContext, useContext } from 'react';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AspectPreset {
  id: string;
  width: number;
  height: number;
  safeArea: SafeAreaInsets;
}

export const ASPECT_PRESETS: Record<string, AspectPreset> = {
  square: {
    id: 'square',
    width: 1080,
    height: 1080,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  vertical: {
    id: 'vertical',
    width: 1080,
    height: 1920,
    safeArea: { top: 140, right: 60, bottom: 220, left: 60 },
  },
  web: {
    id: 'web',
    width: 1920,
    height: 1080,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  tall: {
    id: 'tall',
    width: 1080,
    height: 1350,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  slide: {
    id: 'slide',
    width: 1080,
    height: 1440,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  wide: {
    id: 'wide',
    width: 2560,
    height: 1080,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
};

const defaultPreset = ASPECT_PRESETS['web'] as AspectPreset;

export const AspectPresetContext = createContext<AspectPreset>(defaultPreset);

export function useAspectPreset(): AspectPreset {
  return useContext(AspectPresetContext);
}

export interface AspectPresetProviderProps {
  preset: AspectPreset;
  children: React.ReactNode;
}

export function AspectPresetProvider({ preset, children }: AspectPresetProviderProps): React.ReactElement {
  return (
    <AspectPresetContext.Provider value={preset}>
      {children}
    </AspectPresetContext.Provider>
  );
}
