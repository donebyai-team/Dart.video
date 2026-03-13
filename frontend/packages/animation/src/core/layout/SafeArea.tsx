import React from 'react';
import { useAspectPreset } from '../../styles/AspectPresetContext';

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
      {children}
    </div>
  );
}
