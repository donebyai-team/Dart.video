import React from 'react';
import { useAspectPreset } from '../../styles/AspectPresetContext';

const DEFAULT_SAFE_CONTENT_WIDTH_RATIO = 0.78;

export interface SafeAreaProps {
  children: React.ReactNode;
}

/**
 * Mandatory outermost content wrapper.
 * Reads safe area insets from AspectPresetContext and applies them as padding.
 * Prevents content from overlapping platform UI zones (status bar, gesture nav).
 *
 * LLM rule: always wrap outermost content in SafeArea. Never set padding on root div.
 */
export function SafeArea({ children }: SafeAreaProps): React.ReactElement {
  const preset = useAspectPreset();
  const { top, right, bottom, left } = preset.safeArea;
  const availableWidth = Math.max(1, preset.width - left - right);
  const maxContentWidth = Math.max(1, Math.round(availableWidth * DEFAULT_SAFE_CONTENT_WIDTH_RATIO));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        paddingTop: top,
        paddingRight: right,
        paddingBottom: bottom,
        paddingLeft: left,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: maxContentWidth,
          height: '100%',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
