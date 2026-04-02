import { StyleConfig } from '../types';

export const cleanStyle: StyleConfig = {
  id: 'clean',
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
