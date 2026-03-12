import React from 'react';
import { useDurationCollector } from '../duration/DurationCollector';
import { usePrimitivePatches } from '../patches/PatchContext';

export interface TimelineGateProps {
  frame: number;
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
  frame,
  showAfter,
  hideAfter,
  id,
  children,
}: TimelineGateProps): React.ReactElement | null {
  const registerEndFrame = useDurationCollector();
  // showAfter maps to delay, hideAfter (if set) maps to duration offset
  const { effectiveDelay: effectiveShowAfter } = usePrimitivePatches(id, {
    delay: showAfter,
    duration: hideAfter !== undefined ? hideAfter - showAfter : 0,
  });

  const effectiveHideAfter = hideAfter !== undefined
    ? effectiveShowAfter + (hideAfter - showAfter)
    : undefined;

  registerEndFrame(effectiveHideAfter ?? effectiveShowAfter);

  const isVisible =
    frame >= effectiveShowAfter &&
    (effectiveHideAfter === undefined || frame < effectiveHideAfter);

  if (!isVisible) return null;
  // Wrap in a span with id so the element exists in DOM for hit-testing even when children may not have a wrapping element
  return <span id={id} style={{ display: 'contents' }}>{children}</span>;
}
