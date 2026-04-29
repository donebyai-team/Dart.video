
export const DEFAULT_SPEED_PERCENTAGE = 100;
export const MIN_SPEED_PERCENTAGE = 25;

export function scaleTiming(baseDuration: number, speed: number): number {
  return Math.max(1, Math.round((baseDuration * DEFAULT_SPEED_PERCENTAGE) / Math.max(speed, MIN_SPEED_PERCENTAGE)));
}

export function getSpeed(speed?: number): number {
  return Math.max(speed ?? DEFAULT_SPEED_PERCENTAGE, MIN_SPEED_PERCENTAGE);
}