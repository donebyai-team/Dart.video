/** Spring physics config for a single motion category. */
export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass?: number;
  overshoot?: boolean;
}

/** Timing config for Stagger — not spring-based, just frame offsets. */
export interface StaggerMotionConfig {
  /** Frames between each child's start. LLM can override; this is the style default. */
  delayBetween: number;
  /** Frames before the first child starts. */
  startOffset: number;
}

/** Per-primitive-type spring configs within a style's motion definition. */
export interface MotionConfig {
  /** Slide, Fade, Scale entrance animations */
  entrance: SpringConfig;
  /** Slide, Fade, Scale exit animations */
  exit: SpringConfig;
  /** Counter animated number */
  counter: SpringConfig;
  /** Typewriter text reveal */
  typewriter: SpringConfig;
  /** WordCycle word transition */
  wordcycle: SpringConfig;
  /** Stagger list orchestration timing */
  stagger: StaggerMotionConfig;
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
export type TextTransform = 'none' | 'uppercase' | 'lowercase';
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
  motion: MotionConfig;
  shape: ShapeConfig;
  stroke: StrokeConfig;
  surface: SurfaceConfig;
  type: TypeConfig;
  cursor: CursorConfig;
}
