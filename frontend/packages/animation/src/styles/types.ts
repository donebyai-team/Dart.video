export type Easing =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'ease-in-circ'
  | 'ease-out-circ'
  | 'ease-in-out-circ';

/** Timing config for Stagger — frame offsets only. */
export interface StaggerMotionConfig {
  /** Frames between each child's start. LLM can override; this is the style default. */
  staggerDelay: number;
  /** Frames before the first child starts. */
  startAt: number;
}

export interface ShapeConfig {
  radii: { sm: string; md: string; lg: string; xl: string; full: string };
}

export type StrokeStyle = 'solid' | 'dashed' | 'rough';

export interface StrokeConfig {
  width: number;
  color: 'currentColor' | string;
  style: StrokeStyle;
}

export type SurfaceFill = 'solid' | 'none' | 'glass' | 'gradient';
export type ShadowStyle = 'none' | 'flat' | 'soft' | 'hard' | 'colored';
export type TextureStyle = 'none' | 'grain' | 'paper';

export interface SurfaceConfig {
  fill: SurfaceFill;
  shadow: ShadowStyle;
  texture: TextureStyle;
}

export type FontFamily = 'sans' | 'serif' | 'mono' | 'handwritten';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type LetterSpacing = 'tight' | 'normal' | 'wide';

export interface TypeConfig {
  family: FontFamily;
  transform: TextTransform;
  tracking: LetterSpacing;
}

export type CursorShape = 'line' | 'underscore' | 'block' | 'none';
export type CursorBehavior = 'blink' | 'solid' | 'fade';

export interface CursorConfig {
  shape: CursorShape;
  behavior: CursorBehavior;
}

/** Fully resolved style configuration. Every primitive reads from this.
 *  Structural rules only — no colors. Colors come from ThemeContext (BrandTheme). */
export interface StyleConfig {
  id: string;
  shape: ShapeConfig;
  stroke: StrokeConfig;
  surface: SurfaceConfig;
  type: TypeConfig;
  cursor: CursorConfig;
}
