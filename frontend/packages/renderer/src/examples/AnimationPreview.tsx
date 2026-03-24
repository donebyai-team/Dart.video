import React, { useMemo } from 'react';
import {
  ThemeProvider,
  StyleContextProvider,
  AspectPresetProvider,
  SpeedFactorProvider,
  FramePreset,
  resolveStyle,
  ASPECT_PRESETS,
  darkTheme,
  type BrandTheme,
} from '@coasterai/animation';
import { compileRemoteComponent } from '../compiler';
import { EXAMPLE_ANIMATION_CODE } from './example-animation-code';

const EXAMPLE_BRAND: BrandTheme = {
  ...darkTheme,
  primary:   '#6366f1',
  secondary: '#ec4899',
};

const EXAMPLE_STYLE_ID = 'clean';
const EXAMPLE_PRESET = ASPECT_PRESETS['web']!;

/** Compiles the example code once (module-level). */
const { Component: CompiledComponent, error: compileError } = compileRemoteComponent(
  EXAMPLE_ANIMATION_CODE,
  { validateShapeProps: false },
);

if (compileError) {
  console.error('[AnimationPreview] Compile error:', compileError);
}

/** Inner component that renders the compiled animation. Primitives read frame internally. */
function AnimationInner(): React.ReactElement {
  if (!CompiledComponent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: '#ef4444',
        fontFamily: 'monospace',
        fontSize: 16,
        padding: 40,
        boxSizing: 'border-box',
      }}>
        Compile error: {compileError}
      </div>
    );
  }

  // No frame/fps props — primitives call useCurrentFrame() / useVideoConfig() themselves.
  // Pass only data (slide content); all timing/visuals come from the provider stack.
  return <CompiledComponent data={null} />;
}

/** Full Remotion composition root for the animation example. */
export function AnimationPreview(): React.ReactElement {
  const styleConfig = useMemo(() => resolveStyle(EXAMPLE_STYLE_ID), []);

  return (
    <FramePreset preset={EXAMPLE_PRESET}>
      <div style={{ width: '100%', height: '100%', background: EXAMPLE_BRAND.bg }}>
        <ThemeProvider theme={EXAMPLE_BRAND}>
          <AspectPresetProvider preset={EXAMPLE_PRESET}>
            <StyleContextProvider style={styleConfig}>
              <SpeedFactorProvider factor={1}>
                <AnimationInner />
              </SpeedFactorProvider>
            </StyleContextProvider>
          </AspectPresetProvider>
        </ThemeProvider>
      </div>
    </FramePreset>
  );
}

/**
 * Duration for the example composition.
 *
 * For dynamic duration derived from the animation itself, wrap the component
 * tree in <DurationCollectorProvider onRegister={onRegister}> and call
 * getMaxEndFrame() after the first render (see the header comment above).
 */
export const ANIMATION_PREVIEW_DURATION_FRAMES = 300; // 10 seconds at 30fps
