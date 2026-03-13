import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useDurationCollector } from '../../duration/DurationCollector';
import { usePrimitivePatches } from '../../patches/PatchContext';

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
  const registerEndFrame = useDurationCollector();

  // showAfter maps to startAt, hideAfter delta maps to durationInFrames
  const { effectiveStartAt: effectiveShowAfter } = usePrimitivePatches(id, {
    startAt: showAfter,
    durationInFrames: hideAfter !== undefined ? hideAfter - showAfter : 0,
  });

  const effectiveHideAfter = hideAfter !== undefined
    ? effectiveShowAfter + (hideAfter - showAfter)
    : undefined;

  useMemo(() => { registerEndFrame(effectiveHideAfter ?? effectiveShowAfter); }, [effectiveHideAfter, effectiveShowAfter]);

  const isVisible =
    frame >= effectiveShowAfter &&
    (effectiveHideAfter === undefined || frame < effectiveHideAfter);

  if (!isVisible) return null;
  return <span id={id} style={{ display: 'contents' }}>{children}</span>;
}
