import { createContext, useContext } from 'react';

/**
 * Accumulates frame offsets injected by Stagger.
 * Each Stagger wraps its children in a Provider with the cumulative offset
 * so nested staggers compound correctly.
 *
 * Primitives read this via useFrameOffset() and subtract it from useCurrentFrame()
 * to get their local animation frame.
 */
export const FrameOffsetContext = createContext<number>(0);

export function useFrameOffset(): number {
  return useContext(FrameOffsetContext);
}
