import React, { createContext, useContext, useRef } from 'react';

/**
 * DurationCollector context.
 * Every primitive calls this with its end frame on every render.
 * The probe render collects all registrations to compute total duration.
 * Outside of a Provider, this is a no-op.
 */
export const DurationCollectorContext = createContext<(endFrame: number) => void>(
  // Default: no-op. Primitives work normally outside probe render.
  () => undefined
);

export function useDurationCollector(): (endFrame: number) => void {
  return useContext(DurationCollectorContext);
}

export interface DurationCollectorProviderProps {
  onRegister: (endFrame: number) => void;
  children: React.ReactNode;
}

export function DurationCollectorProvider({
  onRegister,
  children,
}: DurationCollectorProviderProps): React.ReactElement {
  return (
    <DurationCollectorContext.Provider value={onRegister}>
      {children}
    </DurationCollectorContext.Provider>
  );
}

/**
 * Hook for the probe render. Returns a ref to the collected max end frame.
 * Usage: wrap component in DurationCollectorProvider with the returned onRegister.
 */
export function useDurationCollection() {
  const endFrames = useRef<number[]>([]);

  function onRegister(endFrame: number) {
    endFrames.current.push(endFrame);
  }

  function getMaxEndFrame(): number {
    if (endFrames.current.length === 0) return 90;
    return Math.max(...endFrames.current);
  }

  function reset() {
    endFrames.current = [];
  }

  return { onRegister, getMaxEndFrame, reset };
}
