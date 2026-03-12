/**
 * AnimationPreview
 *
 * Compiles example LLM-generated code and wraps it in the full provider stack:
 *   ThemeProvider → AspectPresetProvider → StyleContextProvider → SpeedFactorProvider
 *
 * ThemeProvider  — brand identity (colors, font). Set once, wraps everything.
 * StyleContextProvider — animation style (motion, shape, surface). Set per animation.
 *
 * This is a Remotion composition root — frame is read via useCurrentFrame()
 * and passed down as a prop (per the frame contract).
 */

import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
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

/** Inner component that reads frame and renders the compiled animation. */
function AnimationInner(): React.ReactElement {
  const frame = useCurrentFrame();

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

  return <CompiledComponent frame={frame} fps={30} data={null} />;
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

/** Duration for the example composition. */
export const ANIMATION_PREVIEW_DURATION_FRAMES = 300; // 10 seconds at 30fps
