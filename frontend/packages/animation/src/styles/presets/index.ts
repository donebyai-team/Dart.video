export { cleanStyle } from './clean';
export { boldStyle } from './bold';

import { cleanStyle } from './clean';
import { boldStyle } from './bold';
import { StyleConfig } from '../types';

export const STYLE_PRESETS: Record<string, StyleConfig> = {
  clean: cleanStyle,
  bold: boldStyle,
};
