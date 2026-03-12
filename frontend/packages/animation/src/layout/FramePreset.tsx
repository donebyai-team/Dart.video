import React from 'react';
import { AspectPreset } from '../styles/AspectPresetContext';

export interface FramePresetProps {
  preset: AspectPreset;
  /** Show dashed safe-area debug overlay. Default: false. */
  showSafeArea?: boolean;
  /** Scale for editor viewport fitting (< 1). Default: 1. */
  scale?: number;
  children: React.ReactNode;
}

/**
 * Root composition wrapper. Never used by the LLM.
 * Sets exact width and height from the active AspectPreset.
 * Applies overflow:hidden to clip anything outside the frame.
 */
export function FramePreset({
  preset,
  showSafeArea = false,
  scale = 1,
  children,
}: FramePresetProps): React.ReactElement {
  const { width, height, safeArea } = preset;

  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        flexShrink: 0,
      }}
    >
      {children}

      {showSafeArea && (
        <div
          style={{
            position: 'absolute',
            top: safeArea.top,
            right: safeArea.right,
            bottom: safeArea.bottom,
            left: safeArea.left,
            border: '2px dashed rgba(255, 0, 0, 0.4)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
