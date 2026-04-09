import { StyleConfig } from '../types';

export const boldStyle: StyleConfig = {
  id: 'bold',
  shape: {
    radii: { sm: '0px', md: '0px', lg: '0px', xl: '0px', full: '0px' },
  },
  stroke: {
    width: 3,
    color: 'currentColor',
    style: 'solid',
  },
  surface: {
    fill: 'solid',
    shadow: 'hard',
    texture: 'none',
  },
  type: {
    family: 'sans',
    transform: 'uppercase',
    tracking: 'wide',
  },
  cursor: {
    shape: 'block',
    behavior: 'blink',
  },
};
