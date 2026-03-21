import React, { createContext, useContext, useRef } from 'react';

/**
 * DurationCollector context.
 * Every primitive calls this with its end frame on every render.
 * Animation primitives register end frames here when a collector is provided.
 * Outside of a Provider, this is a no-op.
 */
export const DurationCollectorContext = createContext<(endFrame: number) => void>(
  // Default: no-op. Primitives work normally without a collector provider.
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
 * Usage: wrap a subtree in DurationCollectorProvider to observe end-frame registrations.
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

  return { onRegister, getMaxEndFrame };
}
