import React, { createContext, useContext } from 'react';
import { StyleConfig } from './types';
import { cleanStyle } from './presets/clean';

export const StyleContext = createContext<StyleConfig>(cleanStyle);

export function useStyleContext(): StyleConfig {
  return useContext(StyleContext);
}

export interface StyleContextProviderProps {
  style: StyleConfig;
  children: React.ReactNode;
}

export function StyleContextProvider({ style, children }: StyleContextProviderProps): React.ReactElement {
  return (
    <StyleContext.Provider value={style}>
      {children}
    </StyleContext.Provider>
  );
}
