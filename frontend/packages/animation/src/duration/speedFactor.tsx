import React, { createContext, useContext } from 'react';

/**
 * SpeedFactor context. When set, every primitive scales its delay and duration.
 * speedFactor > 1 = faster animation. speedFactor < 1 = slower.
 * Default is 1 (no adjustment).
 */
export const SpeedFactorContext = createContext<number>(1);

export function useSpeedFactor(): number {
  return useContext(SpeedFactorContext);
}

export interface SpeedFactorProviderProps {
  factor: number;
  children: React.ReactNode;
}

export function SpeedFactorProvider({ factor, children }: SpeedFactorProviderProps): React.ReactElement {
  return (
    <SpeedFactorContext.Provider value={factor}>
      {children}
    </SpeedFactorContext.Provider>
  );
}

/** Apply speed factor to a delay or duration value. */
export function applySpeedFactor(value: number, speedFactor: number): number {
  if (speedFactor === 1) return value;
  return Math.round(value / speedFactor);
}
