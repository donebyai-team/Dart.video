/**
 * Animation component validator service.
 * Runs as a Cloud Run Service (HTTP server).
 *
 * POST /validate
 *   Body: { code, config }
 *   - code:   LLM-generated TSX source that exports RemoteComponent({ props, onChange })
 *   - config: JSON template config passed as props during the renderStill check
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
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
function buildRootEntry(safeCode, safeConfig) {
  return [
    `import React from 'react';`,
    `import { Composition, getInputProps, registerRoot } from 'remotion';`,
    `import { compileRemoteComponent } from '../../../renderer/src/compiler';`,
    ``,
    `const ValidatorComp = () => {`,
    `  const { code, config } = getInputProps();`,
    ``,
    `  // Synchronous JIT compile — throws on syntax / Babel / missing-export errors`,
    `  const result = compileRemoteComponent(code);`,
    `  if (result.error) {`,
    `    throw new Error('[compile_error] ' + result.error);`,
    `  }`,
    ``,
    `  // Runtime render — throws on invalid hooks, bad JSX, undefined refs, etc.`,
    `  const Comp = result.Component;`,
    `  return React.createElement(Comp, { props: config ?? {}, onChange: () => {} });`,
    `};`,
    ``,
    `const ValidatorRoot = () => (`,
    `  React.createElement(Composition, {`,
    `    id: 'ValidatorComp',`,
    `    component: ValidatorComp,`,
    `    durationInFrames: 30,`,
    `    fps: 30,`,
    `    width: 1280,`,
    `    height: 720,`,
    `    defaultProps: { code: ${safeCode}, config: ${safeConfig} },`,
    `  })`,
    `);`,
    ``,
    `registerRoot(ValidatorRoot);`,
  ].join('\n');
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

  let code, config;
  try {
    ({code, config} = JSON.parse(body));
    if (!code) throw new Error('code is required');
  } catch (err) {
    res.writeHead(400);
    res.end(err.message);
    return;
  }

  console.log(
    `[validate] received code (${code.length} chars), ` +
    `config keys: ${Object.keys(config || {}).join(', ') || 'none'}, ` +
    `config: ${JSON.stringify(config ?? {}, null, 2)}`,
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

  // ── Step 2: Render check via Remotion renderStill ────────────────────────
  const uuid = randomUUID();
  const tmpFolder = `generated/_tmp_${uuid}`;
  const templatesDir = resolve(TEMPLATES_DIR, tmpFolder);
  const stillOutput = `/tmp/${uuid}.png`;

  try {
    await mkdir(templatesDir, {recursive: true});

    const safeCode = JSON.stringify(code);
    const safeConfig = JSON.stringify(config || {});
    await writeFile(
      resolve(templatesDir, 'root.tsx'),
      buildRootEntry(safeCode, safeConfig),
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

    console.log('[validate] bundling complete — rendering still frame');
    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: 'ValidatorComp',
      inputProps: {code, config: config || {}},
      chromiumOptions,
    });

    try {
      await renderStill({
        composition,
        serveUrl: bundleDir,
        output: stillOutput,
        inputProps: {code, config: config || {}},
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

    console.log('[validate] render check passed — validation complete');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({}));

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
