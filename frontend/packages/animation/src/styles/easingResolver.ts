import { MotionConfig, SpringConfig, StaggerMotionConfig } from './types';

/** The spring-based primitive categories. */
export type PrimitiveMotionCategory = 'entrance' | 'exit' | 'counter' | 'typewriter' | 'wordcycle';

/**
 * Returns the spring config for a given primitive category from a style's motion config.
 * Each primitive type knows its own category and calls this with it — never a global string.
 */
export function getSpringConfig(
  motion: MotionConfig,
  category: PrimitiveMotionCategory,
): SpringConfig {
  return motion[category];
}

/**
 * Returns the stagger timing config from a style's motion config.
 * Used by Stagger to read style-driven defaults before LLM prop overrides.
 */
export function getStaggerConfig(motion: MotionConfig): StaggerMotionConfig {
  return motion.stagger;
}
