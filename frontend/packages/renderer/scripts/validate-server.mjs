/**
 * Animation component validator service.
 * Runs as a Cloud Run Service (HTTP server).
 *
 * POST /validate
 *   Body: { code, component_name, output_path, config }
 *   - code:           Generated TSX component source
 *   - component_name: PascalCase name (used as file + export name, e.g. "TextCascade")
 *   - output_path:    GCS path prefix where the compiled JS will be uploaded
*
 * Validation happens in two sequential steps so errors are caught early and
 * reported with enough detail for the LLM to self-correct:
 *
 *   Step 1 — Compile check (Node.js, Babel)
 *     Strips imports/exports and runs Babel transform. Catches syntax errors,
 *     invalid JSX, TypeScript parse errors, etc. before any bundling starts.
 *     → 422 { error_type: "compile_error", errors: [...] }
 *
 *   Step 2 — Render check (Remotion renderStill)
 *     Bundles the renderer (which includes compileRemoteComponent) and renders
 *     a single still frame. The validator composition calls compileRemoteComponent
 *     synchronously and THROWS on any error so renderStill captures it. This
 *     catches runtime errors: invalid hook usage, undefined references, bad JSX
 *     output, etc.
 *     → 422 { error_type: "render_error", errors: [...] }
 *
 *   Success:
 *     → 200 {}
 *
 * Error codes:
 *   400  Bad request (missing required fields) — do NOT feed to LLM
 *   500  Internal server error                 — do NOT feed to LLM
 */

import * as Babel from '@babel/standalone';
import {Storage} from '@google-cloud/storage';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {compileRemoteComponent} from '../src/compiler.ts'
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const storage = new Storage();
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || 'coasterai-public';
if (!OUTPUT_BUCKET) throw new Error('Missing required env var OUTPUT_BUCKET');

const PORT = parseInt(process.env.PORT || '8085', 10);

// Cloud Run has no GPU — use SwiftShader (software OpenGL)
const chromiumOptions = {
  gl: 'swiftshader',
  disableWebSecurity: true,
};

// Path layout (relative to packages/renderer/scripts/):
//   ../src            → packages/renderer/src/
//   ../../templates   → packages/templates/
const RENDERER_SRC_DIR = resolve(__dirname, '../src');
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

// ── Step 1: Compile check (Node.js / Babel) ───────────────────────────────────

/**
 * Fast pre-validate using Babel in Node.js (no bundling / browser spin-up).
 * Returns null on success, or the full Babel error string on failure.
 *
 * We pass the raw LLM code with sourceType "module" so Babel handles
 * import/export statements natively — no need to duplicate the stripImports
 * logic from compiler.ts. We only care whether Babel throws, not the output.
 * The error includes Babel's codeFrame pointing at the exact problem line.
 * Feed this directly to the LLM.
 */
function preValidateWithBabel(code) {
  try {
    const result = Babel.transform(code, {
      presets: ['react', 'typescript'],
      filename: 'remote-component.tsx',
      sourceType: 'module',
    });
    if (!result?.code) {
      return 'Babel produced no output — the code may be empty or malformed';
    }
    return null; // success
  } catch (err) {
    // err.message contains Babel's human-readable error + codeFrame
    return err.stack || err.message;
  }
}

// ── Step 2: Render check root entry ──────────────────────────────────────────

/**
 * Build root.tsx for the validator composition.
 *
 * ValidatorComp compiles the LLM code SYNCHRONOUSLY during render and THROWS
 * on any error. This is critical: DynamicComp (used in the editor) catches
 * errors and shows an error UI — renderStill would succeed and we would never
 * know something was wrong. ValidatorComp throws instead, causing renderStill
 * to fail and surface the full stack trace.
 *
 * Compile errors are tagged "[compile_error]" so the server can set the correct
 * error_type even if the Babel pre-check somehow missed them. Runtime errors
 * (bad hooks, undefined vars in JSX, etc.) propagate naturally.
 */
const TAIL_BUFFER = 20;

function buildRootEntry(code) {
  return [
    `import React, { useEffect } from 'react';`,
    `import { Composition, registerRoot } from 'remotion';`,
    `import { compileRemoteComponent } from '@/compiler';`,
    `import {`,
    `  DurationCollectorProvider,`,
    `  ThemeProvider,`,
    `  AspectPresetProvider,`,
    `  StyleContextProvider,`,
    `  SpeedFactorProvider,`,
    `  defaultTheme,`,
    `  resolveStyle,`,
    `} from '@coasterai/animation';`,
    ``,
    `const __CODE__ = ${JSON.stringify(code)};`,
    `const __TAIL_BUFFER__ = ${TAIL_BUFFER};`,
    ``,
    `// Probe component: renders the animation to collect duration via DurationCollector.`,
    `const ProbeComp = () => {`,
    `  const endFrames = React.useRef([]);`,
    `  const onRegister = (endFrame) => { endFrames.current.push(endFrame); };`,
    ``,
    `  const { Component, error } = compileRemoteComponent(__CODE__, { validateShapeProps: true });`,
    `  if (error || !Component) {`,
    `    throw new Error('[compile_error] ' + (error || 'Unknown compilation error'));`,
    `  }`,
    ``,
    `  useEffect(() => {`,
    `    const frames = endFrames.current;`,
    `    const settledFrame = frames.length > 0 ? Math.max(...frames) : 90;`,
    `    window.__ANIMATION_DURATION__ = {`,
    `      settledFrame,`,
    `      durationInFrames: settledFrame + __TAIL_BUFFER__,`,
    `    };`,
    `  }, []);`,
    ``,
    `  const preset = { id: 'probe', width: 1280, height: 720, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } };`,
    ``,
    `  return (`,
    `    React.createElement(ThemeProvider, { theme: defaultTheme },`,
    `      React.createElement(AspectPresetProvider, { preset },`,
    `        React.createElement(StyleContextProvider, { style: resolveStyle('clean') },`,
    `          React.createElement(SpeedFactorProvider, { factor: 1 },`,
    `            React.createElement(DurationCollectorProvider, { onRegister },`,
    `              React.createElement(Component, null)`,
    `            )`,
    `          )`,
    `        )`,
    `      )`,
    `    )`,
    `  );`,
    `};`,
    ``,
    `const ValidatorRoot = () => {`,
    `  return React.createElement(Composition, {`,
    `    id: 'ValidatorComp',`,
    `    component: ProbeComp,`,
    `    durationInFrames: 300,`,
    `    fps: 30,`,
    `    width: 1280,`,
    `    height: 720,`,
    `    calculateMetadata: async () => {`,
    `      const dur = typeof window !== 'undefined' && window.__ANIMATION_DURATION__;`,
    `      return { durationInFrames: dur ? dur.durationInFrames : 150 };`,
    `    },`,
    `  });`,
    `};`,
    ``,
    `registerRoot(ValidatorRoot);`,
  ].join('\n');
}

// ---- GCS helpers ----
async function uploadToGCS(bucket, gcsPath, fileBuffer) {
  await storage.bucket(bucket).file(gcsPath).save(fileBuffer, {
    metadata: {
      contentType: 'text/plain',
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: 'inline'
    },
  });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

// Strip Remotion bundle URLs from stack traces so the LLM sees source-level
// context rather than cryptic bundle offsets like "(https://...bundle.js:1:234567)".
function cleanStack(rawStack) {
  return rawStack
    .split('\n')
    .map((line) => line.replace(/\s*\(https?:\/\/[^)]*bundle\.js[^)]*\)/, ''))
    .join('\n');
}

function dedupe(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function isLikelyNoiseFrame(frameLine) {
  // Minified React/Remotion internals often appear as `at Nh`, `at J`, `at MessagePort.R`.
  const match = frameLine.match(/^\s*at\s+([^\s(]+)/);
  if (!match) return false;
  const fn = match[1];
  if (/^(MessagePort\.)?[A-Z][A-Za-z0-9_$]{0,2}$/.test(fn)) return true;
  return false;
}

function formatRenderErrorForLlm(err) {
  const rawStack = err?.stack || err?.message || String(err);
  const cleaned = cleanStack(rawStack)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (cleaned.length === 0) return String(err);

  const headline = cleaned[0];
  const frames = cleaned.slice(1).filter((line) => /^\s*at\s+/.test(line));

  const relevantFrames = dedupe(
    frames.filter((line) => {
      if (isLikelyNoiseFrame(line)) return false;
      return (
        /eval at evalWithScope/.test(line) ||
        /RemoteComponent/.test(line) ||
        /compileRemoteComponent/.test(line) ||
        /Array\.map/.test(line) ||
        /<anonymous>:\d+:\d+/.test(line) ||
        /ValidatorComp/.test(line)
      );
    }),
  ).slice(0, 12);

  if (relevantFrames.length === 0) {
    return cleaned.join('\n');
  }

  return [headline, 'Relevant stack:', ...relevantFrames].join('\n');
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handleValidate(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400);
    res.end('Failed to read request body');
    return;
  }

   let code, component_name, output_path;
  try {
    ({code, component_name, output_path} = JSON.parse(body));
    if (!code) throw new Error('code is required');
    if (!component_name) throw new Error('component_name is required');
    if (!output_path) throw new Error('output_path is required');
  } catch (err) {
    res.writeHead(400);
    res.end(err.message);
    return;
  }

  console.log(
    `[validate] received code (${code.length} chars), ` +
    `component_name: ${component_name}, ` +
    `output_path: ${output_path}`,
  );

  // ── Step 1: Fast compile check ───────────────────────────────────────────
  console.log('[validate] step 1 — compile check (Babel/Node.js)');
  const compileError = preValidateWithBabel(code);
  if (compileError) {
    console.log('[validate] compile check FAILED:\n', compileError);
    res.writeHead(422, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error_type: 'compile_error', errors: [compileError]}));
    return;
  }
  console.log('[validate] compile check passed');

  console.log('Compiling and assigning primitive IDs...');

  // compileRemoteComponent strips imports, runs primitive ID pass, and transpiles
  const result = compileRemoteComponent(code, { validateShapeProps: true });
  if (result.error) {
    console.log('[validate] compile check FAILED:\n', result.error);
    res.writeHead(422, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error_type: 'compile_error', errors: [result.error]}));
    return;
  }

  const initialOverlay = result.initialOverlay ?? {};

  // ── Step 2: Render check via Remotion renderStill ────────────────────────
  const uuid = randomUUID();
  const tmpFolder = `generated/_tmp_${uuid}`;
  const templatesDir = resolve(TEMPLATES_DIR, tmpFolder);
  const stillOutput = `/tmp/${uuid}.png`;

  try {
    await mkdir(templatesDir, {recursive: true});

    await writeFile(
      resolve(templatesDir, 'root.tsx'),
      buildRootEntry(code),
      'utf8',
    );

    console.log('[validate] step 2 — bundling for render check');
    const bundleDir = await bundle({
      entryPoint: resolve(templatesDir, 'root.tsx'),
      webpackOverride: (cfg) => ({
        ...cfg,
        resolve: {
          ...cfg.resolve,
          // '@' alias lets compiler.ts resolve '@/...' imports from renderer/src/
          alias: {...cfg.resolve?.alias, '@': RENDERER_SRC_DIR},
          modules: [
            ...(cfg.resolve?.modules ?? ['node_modules']),
            resolve(__dirname, '../node_modules'),       // packages/renderer/node_modules
            resolve(__dirname, '../../../node_modules'), // frontend root node_modules
          ],
        },
      }),
    });

    console.log('[validate] bundling complete — selecting composition (triggers duration probe)');
    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: 'ValidatorComp',
      inputProps: {},
      chromiumOptions,
    });

    // Duration was computed by DurationCollector during selectComposition's
    // calculateMetadata call. The composition now has the correct durationInFrames.
    const settledFrame = composition.durationInFrames - TAIL_BUFFER;
    const durationInFrames = composition.durationInFrames;
    console.log(`[validate] duration detected: settledFrame=${settledFrame}, durationInFrames=${durationInFrames}`);

    try {
      await renderStill({
        composition,
        serveUrl: bundleDir,
        output: stillOutput,
        inputProps: {},
        chromiumOptions,
        frame: 0,
      });
    } catch (renderErr) {
      // renderStill throws when ValidatorComp throws during rendering.
      // Covers both late compile errors and runtime rendering errors.
      const formatted = formatRenderErrorForLlm(renderErr);

      // ValidatorComp tags compile failures with "[compile_error]"
      const errorType = formatted.includes('[compile_error]') ? 'compile_error' : 'render_error';

      console.log(`[validate] render check FAILED (${errorType}):\n`, formatted);
      res.writeHead(422, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error_type: errorType, errors: [formatted]}));
      return;
    }

    // ---- Upload original code to GCS ----
    // The editor's compileRemoteComponent re-runs the AST pass which injects
    // IDs and style spreads. Uploading original code keeps the source clean.
    const gcsPath = `${output_path}/${component_name}.tsx`;
    await uploadToGCS(OUTPUT_BUCKET, gcsPath, Buffer.from(code, 'utf8'));

    console.log('[validate] render check passed — validation complete');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      initialOverlay,
      gcsPath: `https://storage.googleapis.com/${OUTPUT_BUCKET}/${gcsPath}`,
      duration: {
        settledFrame,
        durationInFrames,
      },
    }));

  } catch (err) {
    // Unexpected internal errors (bundler crash, fs failure, etc.)
    // Do NOT feed these to the LLM.
    console.error('[validate] internal server error', err);
    res.writeHead(500);
    res.end('Internal server error');
  } finally {
    await rm(templatesDir, {recursive: true, force: true}).catch(() => {});
    if (existsSync(stillOutput)) await rm(stillOutput, {force: true}).catch(() => {});
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

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
  console.log(`[validate] server listening on port ${PORT}`);
});
