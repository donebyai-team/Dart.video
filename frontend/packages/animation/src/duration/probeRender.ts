import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DurationCollectorProvider } from './DurationCollector';

/** Tail buffer added after the last registered end frame. */
const TAIL_BUFFER_FRAMES = 20;

/**
 * Runs a probe render at frame=0 to collect all primitive end frame registrations.
 * Returns the total duration in frames (max end frame + tail buffer).
 *
 * The component must be wrapped in DurationCollector-aware providers before calling this.
 */
export function probeRender(
  element: React.ReactElement,
): number {
  const endFrames: number[] = [];

  function onRegister(endFrame: number) {
    endFrames.push(endFrame);
  }

  const wrapped = React.createElement(
    DurationCollectorProvider,
    { onRegister, children: element },
  );

  try {
    renderToStaticMarkup(wrapped);
  } catch {
    // Probe render failures are non-fatal — return a safe default duration
    return 90 + TAIL_BUFFER_FRAMES;
  }

  if (endFrames.length === 0) return 90 + TAIL_BUFFER_FRAMES;
  return Math.max(...endFrames) + TAIL_BUFFER_FRAMES;
}
