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

const BUNDLE_OUTPUT = '/app/renderer/remotion-bundle';

console.log('Pre-bundling Remotion composition...');

const bundlePath = await bundle({
  entryPoint: resolve(__dirname, '../src/remotion-entry.ts'),
  onProgress: (p) => process.stdout.write(`  ${p}%\r`),
});

console.log(`\nBundle created at: ${bundlePath}`);
console.log(`Copying to: ${BUNDLE_OUTPUT}`);

mkdirSync(BUNDLE_OUTPUT, {recursive: true});
cpSync(bundlePath, BUNDLE_OUTPUT, {recursive: true});

console.log('Pre-bundle complete.');
