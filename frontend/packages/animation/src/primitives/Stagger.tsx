import React from 'react';
import { useDurationCollector } from '../duration/DurationCollector';
import { usePrimitivePatches } from '../patches/PatchContext';
import { useStyleContext } from '../styles/StyleContext';
import { getStaggerConfig } from '../styles/easingResolver';

export interface StaggerProps {
  frame: number;
  startAt?: number;
  delayBetween?: number;
  /** Injected by compiler AST pass. Goes on the outer wrapper div — the whole group is selectable, not individual children. */
  id?: string;
  children: React.ReactNode;
}

/**
 * Timing orchestrator for lists of 2+ items.
 * Clones each child with an increasing frame offset.
 *
 * Default timing (startAt, delayBetween) comes from StyleContext.motion.stagger.
 * LLM can override with explicit props — if omitted, style defaults apply.
 *
 * The id is placed on an outer wrapper div — the editor selects the Stagger group
 * as a whole. Individual children within a Stagger are NOT individually selectable.
 */
export function Stagger({
  frame,
  startAt,
  delayBetween,
  id,
  children,
}: StaggerProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const staggerDefaults = getStaggerConfig(styleConfig.motion);

  // LLM prop takes precedence; style default used when prop is not provided
  const resolvedStartAt = startAt ?? staggerDefaults.startOffset;
  const resolvedDelayBetween = delayBetween ?? staggerDefaults.delayBetween;

  const registerEndFrame = useDurationCollector();
  // For Stagger, 'delay' maps to startAt and 'duration' maps to delayBetween
  const { effectiveDelay: effectiveStart, effectiveDuration: effectiveDelayBetween } =
    usePrimitivePatches(id, { delay: resolvedStartAt, duration: resolvedDelayBetween });

  const childArray = React.Children.toArray(children);
  const childCount = childArray.length;

  const estimatedChildDuration = 30;
  const endFrame = effectiveStart + (childCount - 1) * effectiveDelayBetween + estimatedChildDuration;
  registerEndFrame(endFrame);

  const cloned = childArray.map((child, index) => {
    const childOffset = effectiveStart + index * effectiveDelayBetween;
    const childFrame = frame - childOffset;

    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{ frame: number }>, {
        frame: childFrame,
      });
    }
    return child;
  });

  return (
    <div id={id} style={{ display: 'contents' }}>
      {cloned}
    </div>
  );
}
