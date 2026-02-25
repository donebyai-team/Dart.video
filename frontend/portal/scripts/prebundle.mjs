/**
 * Pre-bundles the Remotion composition at Docker build time.
 * Run once during image build: `pnpm node scripts/prebundle.mjs`
 * Output is written to /app/portal/remotion-bundle and used by render-cloudrun.mjs.
 */
import {bundle} from '@remotion/bundler';
import {cpSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const BUNDLE_OUTPUT = '/app/portal/remotion-bundle';

console.log('Pre-bundling Remotion composition...');

const bundlePath = await bundle({
  entryPoint: resolve('./src/render/index.ts'),
  onProgress: (p) => process.stdout.write(`  ${p}%\r`),
  // Replicate the TypeScript `@/*` path alias so webpack can resolve
  // imports like `@/stores/video` → `src/stores/video`
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@': resolve('./src'),
      },
    },
  }),
});

console.log(`\nBundle created at: ${bundlePath}`);
console.log(`Copying to: ${BUNDLE_OUTPUT}`);

mkdirSync(BUNDLE_OUTPUT, {recursive: true});
cpSync(bundlePath, BUNDLE_OUTPUT, {recursive: true});

console.log('Pre-bundle complete.');
