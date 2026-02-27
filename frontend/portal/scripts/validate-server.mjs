/**
 * Animation component validator service.
 * Runs as a Cloud Run Service (HTTP server).
 *
 * POST /validate
 *   Body: { code, component_name, output_path, config }
 *   - code:           Generated TSX component source
 *   - component_name: PascalCase name (used as file + export name, e.g. "TextCascade")
 *   - output_path:    GCS path prefix where the compiled JS will be uploaded
 *   - config:         JSON template config passed as props to the component during renderStill
 *
 * Responses:
 *   200 { js_path }             — success, CDN JS uploaded to GCS
 *   422 { error_type, errors }  — build_error or render_error (feed to LLM)
 *   400                         — bad request (missing fields)
 *   500                         — internal server error (do NOT feed to LLM)
 *
 * NOTE: Generated components should import from '../lib/...' (one level up from their
 * folder). The temp folder is placed at packages/templates/generated/_tmp_<uuid>/
 * which mirrors the two-level depth of existing templates (e.g. text-animation/text-cascade/).
 */

import {Storage} from '@google-cloud/storage';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import webpack from 'webpack';

const storage = new Storage();

// __dirname = frontend/portal/scripts/ (local) or /app/portal/scripts/ (Docker)
const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '8085', 10);
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || 'coasterai-public';
if (!OUTPUT_BUCKET) throw new Error('Missing required env var OUTPUT_BUCKET');

// Cloud Run has no GPU — use SwiftShader (software OpenGL)
const chromiumOptions = {
  gl: 'swiftshader',
  disableWebSecurity: true,
};

// Paths relative to portal/scripts/ — works identically locally and in Docker
// local:  frontend/portal/scripts/ → ../../packages/... = frontend/packages/...
// Docker: /app/portal/scripts/     → ../../packages/... = /app/packages/...
const TEMPLATES_DIR = resolve(__dirname, '../../packages/templates');
const BUILD_DIR = resolve(__dirname, '../../packages/build');
const PORTAL_SRC_DIR = resolve(__dirname, '../src');

// ---- Webpack CDN build (mirrors build-component.mjs logic) ----
// templateFolder is relative to TEMPLATES_DIR (e.g. "generated/_tmp_<uuid>")
function buildComponentCDN(templateFolder, componentName, outFile) {
  return new Promise((res, rej) => {
    const entry = resolve(TEMPLATES_DIR, templateFolder, `${componentName}.tsx`);
    const globalName = `__COASTER_TEMPLATE__${componentName.replace(/[^a-zA-Z0-9_$]/g, '')}`;

    const config = {
      mode: 'production',
      target: 'web',
      entry,
      output: {
        path: BUILD_DIR,
        filename: outFile,
        library: {type: 'window', name: globalName},
        clean: false,
      },
      externalsType: 'window',
      externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'react/jsx-runtime': 'ReactJSXRuntime',
        remotion: 'Remotion',
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {'@': PORTAL_SRC_DIR},
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: {
              loader: 'swc-loader',
              options: {
                jsc: {
                  parser: {syntax: 'typescript', tsx: true},
                  transform: {react: {runtime: 'automatic'}},
                },
              },
            },
          },
        ],
      },
    };

    webpack(config, (err, stats) => {
      if (err) {
        rej({type: 'build_error', errors: [err.message]});
        return;
      }
      if (stats?.hasErrors()) {
        const info = stats.toJson({errors: true, errorDetails: false});
        const errors = (info.errors ?? []).map((e) =>
          typeof e === 'string' ? e : (e.message ?? stats.toString({colors: false})),
        );
        rej({type: 'build_error', errors: errors.length ? errors : ['Unknown build error']});
        return;
      }
      res(resolve(BUILD_DIR, outFile));
    });
  });
}

// ---- GCS helpers ----
async function uploadToGCS(bucket, gcsPath, fileBuffer) {
  await storage.bucket(bucket).file(gcsPath).save(fileBuffer, {
    metadata: {
      contentType: 'application/javascript',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
}

// ---- HTTP helpers ----
function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

// ---- Request handler ----
async function handleValidate(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400);
    res.end('Failed to read request body');
    return;
  }

  let code, component_name, output_path, config;
  try {
    ({code, component_name, output_path, config} = JSON.parse(body));
    if (!code) throw new Error('code is required');
    if (!component_name) throw new Error('component_name is required');
    if (!output_path) throw new Error('output_path is required');
  } catch (err) {
    res.writeHead(400);
    res.end(err.message);
    return;
  }

  console.log("CONFIG RECEIVED:", config)

  const uuid = randomUUID();
  // Place at generated/_tmp_<uuid>/ — two levels deep from packages/templates/,
  // matching existing templates (text-animation/text-cascade/) so that
  // '../../lib/EditableText' imports resolve to packages/templates/lib/.
  const tmpFolder = `generated/_tmp_${uuid}`;
  const templatesDir = resolve(TEMPLATES_DIR, tmpFolder);
  const stillOutput = `/tmp/${uuid}.png`;

  try {
    await mkdir(templatesDir, {recursive: true});
    await writeFile(resolve(templatesDir, `${component_name}.tsx`), code, 'utf8');

    // ---- Step 1: CDN webpack build ----
    const outFile = `${uuid}.cdn.js`;
    let builtFilePath;
    try {
      builtFilePath = await buildComponentCDN(tmpFolder, component_name, outFile);
    } catch (buildErr) {
      console.log('build failed', buildErr);
      res.writeHead(422, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error_type: buildErr.type, errors: buildErr.errors}));
      return;
    }
    console.log('build passed');

    // ---- Step 2: Remotion renderStill ----
    // Generate a minimal Remotion root that imports the validated component.
    // The component API is: RemoteComponent({ props, onChange }) where
    // 'props' is the template config JSON.
    const safeConfig = JSON.stringify(config || {});
    const rootEntry = [
      `import {Composition, getInputProps, registerRoot} from 'remotion';`,
      `import {RemoteComponent} from './${component_name}';`,
      ``,
      `const _defaultConfig = ${safeConfig};`,
      ``,
      `const WrappedComponent = ({config}) => (`,
      `  <RemoteComponent props={config} onChange={() => {}} />`,
      `);`,
      ``,
      `const ValidatorRoot = () => {`,
      `  const ip = getInputProps();`,
      `  const config = ip?.config ?? _defaultConfig;`,
      `  return (`,
      `    <Composition`,
      `      id="ValidatorComp"`,
      `      component={WrappedComponent}`,
      `      durationInFrames={30}`,
      `      fps={30}`,
      `      width={1280}`,
      `      height={720}`,
      `      defaultProps={{config}}`,
      `    />`,
      `  );`,
      `};`,
      ``,
      `registerRoot(ValidatorRoot);`,
    ].join('\n');

    await writeFile(resolve(templatesDir, 'root.tsx'), rootEntry, 'utf8');

    console.log("bundelling..")
    const bundleDir = await bundle({
      entryPoint: resolve(templatesDir, 'root.tsx'),
      webpackOverride: (cfg) => ({
        ...cfg,
        resolve: {
          ...cfg.resolve,
          alias: {...cfg.resolve?.alias, '@': PORTAL_SRC_DIR},
          modules: [
            ...(cfg.resolve?.modules ?? ['node_modules']),
            resolve(__dirname, '../node_modules'),
            resolve(__dirname, '../../node_modules'),
          ],
        },
      }),
    });

    console.log("rendering..")
    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: 'ValidatorComp',
      inputProps: {config: config || {}},
      chromiumOptions,
    });

    try {
      await renderStill({
        composition,
        serveUrl: bundleDir,
        output: stillOutput,
        inputProps: {config: config || {}},
        chromiumOptions,
        frame: 0,
      });
    } catch (renderErr) {
      console.log('render failed', renderErr);
      res.writeHead(422, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error_type: 'render_error', errors: [renderErr.message]}));
      return;
    }

    console.log('render complete');
    // ---- Step 3: Upload CDN JS to GCS ----
    const fileBuffer = await readFile(builtFilePath);
    const gcsPath = `${output_path}/${component_name}.cdn.js`;
    await uploadToGCS(OUTPUT_BUCKET, gcsPath, fileBuffer);

    console.log('Validation complete', {component_name, gcsPath});
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({js_path: gcsPath}));
  } catch (err) {
    console.error('Validator internal error', err);
    res.writeHead(500);
    res.end('Internal server error');
  } finally {
    await rm(templatesDir, {recursive: true, force: true}).catch(() => {});
    if (existsSync(stillOutput)) await rm(stillOutput, {force: true}).catch(() => {});
  }
}

// ---- Server ----
const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/validate') {
    await handleValidate(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Validator service listening on port ${PORT}`);
});
