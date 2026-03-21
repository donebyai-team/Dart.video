
/**
 * Scales an absolute pixel value designed for a 1080-base canvas
 * to the correct size for the active aspect preset.
 *
 * Uses the shorter canvas dimension as the scale reference so values
 * feel consistent regardless of whether the canvas is wider or taller.
 *
 * Examples at common presets:
 *   web (1920×1080):      scale = 1.0  → 24 → 24px
 *   square (1080×1080):   scale = 1.0  → 24 → 24px
 *   vertical (1080×1920): scale = 1.0  → 24 → 24px
 *   wide (2560×1080):     scale = 1.0  → 24 → 24px
 *   tall (1080×1350):     scale = 1.0  → 24 → 24px
 */

import { AspectPreset } from "../styles";

const BASE = 1080;

export function scaleToCanvas(value: number, preset: AspectPreset): number {
  const scale = Math.min(preset.width, preset.height) / BASE;
  return Math.round(value * scale);
}