import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePrimitivePatches } from '../../patches/PatchContext';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface TimelineGateProps {
  showAfter: number;
  hideAfter?: number;
  id?: string;
  children: React.ReactNode;
}

/**
 * Shows or hides children within a frame window.
 * Use instead of JSX conditionals for animated elements.
 */
export function TimelineGate({
  showAfter,
  hideAfter,
  id,
  children,
}: TimelineGateProps): React.ReactElement | null {
  const frame = useCurrentFrame();

  const speedFactor = useSpeedFactor();
  const adjustedShowAfter = applySpeedFactor(showAfter, speedFactor);
  const adjustedHideAfter = hideAfter !== undefined ? applySpeedFactor(hideAfter, speedFactor) : undefined;
  
  

  // showAfter maps to startAt, hideAfter delta maps to durationInFrames
  const { effectiveStartAt: effectiveShowAfter } = usePrimitivePatches(id, {
    startAt: adjustedShowAfter,
    durationInFrames: adjustedHideAfter !== undefined ? adjustedHideAfter - adjustedShowAfter : 0,
  });

  const effectiveHideAfter = adjustedHideAfter !== undefined
    ? effectiveShowAfter + (adjustedHideAfter - adjustedShowAfter)
    : undefined;


  const isVisible =
    frame >= effectiveShowAfter &&
    (effectiveHideAfter === undefined || frame < effectiveHideAfter);

  if (!isVisible) return null;
  return <span id={id} style={{ display: 'contents' }}>{children}</span>;
}
