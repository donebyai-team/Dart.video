import { StyleConfig } from '../types';

export const boldStyle: StyleConfig = {
  id: 'bold',
  motion: {
    entrance:   'ease-out-back',
    exit:       'ease-in-back',
    counter:    'ease-out',
    typewriter: 'linear',
    wordcycle:  'ease-out-back',
    stagger:    { staggerDelay: 6, startAt: 0 },
  },
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
