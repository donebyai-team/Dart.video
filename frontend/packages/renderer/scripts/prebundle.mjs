/**
 * Pre-bundles the Remotion composition at Docker build time.
 * Run once during image build: `pnpm node scripts/prebundle.mjs`
 * Output is written to /app/portal/remotion-bundle and used by render-cloudrun.mjs.
 */
import {bundle} from '@remotion/bundler';
import {cpSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// scripts/ → renderer/ → packages/ → app/ → portal/
const portalSrc = resolve(__dirname, '../../../portal/src');
const portalNodeModules = resolve(__dirname, '../../../portal/node_modules');

const BUNDLE_OUTPUT = '/app/portal/remotion-bundle';

console.log('Pre-bundling Remotion composition...');

const bundlePath = await bundle({
  entryPoint: resolve(__dirname, '../src/remotion-entry.ts'),
  onProgress: (p) => process.stdout.write(`  ${p}%\r`),
  webpackOverride: (config) => ({
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
  }),
});

console.log(`\nBundle created at: ${bundlePath}`);
console.log(`Copying to: ${BUNDLE_OUTPUT}`);

mkdirSync(BUNDLE_OUTPUT, {recursive: true});
cpSync(bundlePath, BUNDLE_OUTPUT, {recursive: true});

console.log('Pre-bundle complete.');
