import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePrimitivePatches } from '../../patches/PatchContext';
import { useStyleContext } from '../../styles/StyleContext';
import { getStaggerConfig } from '../../styles/easingResolver';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface StaggerProps {
  startAt?: number;
  staggerDelay?: number;
  /** Injected by compiler AST pass. Goes on the outer wrapper div. */
  id?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Timing orchestrator for lists of 2+ items.
 * Clones each child injecting `startAt: startAt + index * staggerDelay`
 * so each child's animation begins at the correct absolute frame.
 *
 * Default timing comes from StyleContext.motion.stagger.
 * LLM can override with explicit props.
 */
export function Stagger({
  startAt,
  staggerDelay,
  id,
  children,
  className,
  style,
}: StaggerProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const staggerDefaults = getStaggerConfig(styleConfig.motion);

  const resolvedStartAt      = startAt      ?? staggerDefaults.startAt;
  const resolvedStaggerDelay = staggerDelay ?? staggerDefaults.staggerDelay;

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(resolvedStartAt, speedFactor);
  const adjustedStaggerDelay = applySpeedFactor(resolvedStaggerDelay, speedFactor);


  // Patch: 'startAt' maps to delay slot, 'staggerDelay' maps to duration slot
  const { effectiveStartAt, effectiveDurationInFrames: effectiveStaggerDelay } =
    usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedStaggerDelay });

  const childArray = React.Children.toArray(children);


  return (
    <div id={id} className={className} style={style}>
      {childArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;
        const childStartAt = effectiveStartAt + index * effectiveStaggerDelay;
        const isVisible = frame >= childStartAt;
        return React.cloneElement(child as React.ReactElement<any>, {
          key: index,
          startAt: childStartAt,
          style: {
            ...((child.props as any).style ?? {}),
            opacity: isVisible ? 1 : 0,
            visibility: isVisible ? 'visible' : 'hidden',
          },
        });
      })}
    </div>
  );
}
