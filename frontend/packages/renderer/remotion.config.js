import {Config} from '@remotion/cli/config';
import {resolve} from 'node:path';

// process.cwd() = packages/renderer/ when `pnpm run render` is invoked from this package
const portalSrc = resolve('../../portal/src');
const portalNodeModules = resolve('../../portal/node_modules');

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      '@': portalSrc,
    },
    modules: [
      ...(config.resolve?.modules ?? ['node_modules']),
      portalNodeModules,
    ],
  },
}));
