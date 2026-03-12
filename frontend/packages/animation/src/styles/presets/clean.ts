import { StyleConfig } from '../types';

export const cleanStyle: StyleConfig = {
  id: 'clean',
  motion: {
    entrance:   { damping: 20, stiffness: 300, overshoot: false },
    exit:       { damping: 20, stiffness: 300, overshoot: false },
    counter:    { damping: 20, stiffness: 200, overshoot: false },
    typewriter: { damping: 100, stiffness: 200, overshoot: false },
    wordcycle:  { damping: 20, stiffness: 250, overshoot: false },
    stagger:    { delayBetween: 12, startOffset: 0 },
  },
  shape: {
    radii: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
  },
  stroke: {
    width: 1,
    color: 'currentColor',
    style: 'solid',
  },
  surface: {
    fill: 'solid',
    shadow: 'soft',
    texture: 'none',
  },
  type: {
    family: 'sans',
    transform: 'none',
    tracking: 'normal',
  },
  cursor: {
    shape: 'line',
    behavior: 'blink',
  },
};
