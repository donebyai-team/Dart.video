/**
 * Animation component validator service.
 * Runs as a Cloud Run Service (HTTP server).
 *
 * POST /validate
 *   Body: { code, output_path, config }
 *   - code:           Generated TSX component source
 *   - output_path:    GCS path prefix where the generated files will be uploaded
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

import {Storage} from '@google-cloud/storage';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {compileRemoteComponent} from '../src/compiler.ts'
import {assignPrimitiveIds, transformAssignedPrimitiveIds} from '../src/primitive-ast-pass.ts'
import {
  computeAnimationDurationFromCode,
  FALLBACK_DURATION_IN_FRAMES,
  FALLBACK_SETTLED_FRAME,
  getDeclaredSettledFrame,
  isValidDeclaredSettledFrame,
  TAIL_BUFFER,
} from '../src/code_rules_validators/animation-duration.ts';
import {parseValidateRequestBody, validateGeneratedCode} from '../src/code_rules_validators/validate-request.ts';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

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
function buildRootEntry(code, durationInFrames) {
  return [
    `import React from 'react';`,
    `import { Composition, registerRoot } from 'remotion';`,
    `import { compileRemoteComponent } from '@/compiler';`,
    `import {`,
    `  ThemeProvider,`,
    `  AspectPresetProvider,`,
    `  StyleContextProvider,`,
    `  SpeedFactorProvider,`,
    `  defaultTheme,`,
    `  resolveStyle,`,
    `} from '@coasterai/animation';`,
    ``,
    `const __CODE__ = ${JSON.stringify(code)};`,
    ``,
    `const ProbeComp = () => {`,
    `  const { Component, error } = compileRemoteComponent(__CODE__, { validateShapeProps: true });`,
    `  if (error || !Component) {`,
    `    throw new Error('[compile_error] ' + (error || 'Unknown compilation error'));`,
    `  }`,
    ``,
    `  const preset = { id: 'probe', width: 1280, height: 720, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } };`,
    ``,
    `  return (`,
    `    React.createElement(ThemeProvider, { theme: defaultTheme },`,
    `      React.createElement(AspectPresetProvider, { preset },`,
    `        React.createElement(StyleContextProvider, { style: resolveStyle('clean') },`,
    `          React.createElement(SpeedFactorProvider, { factor: 1 },`,
    `            React.createElement(Component, null)`,
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
    `    durationInFrames: ${durationInFrames},`,
    `    fps: 30,`,
    `    width: 1280,`,
    `    height: 720,`,
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

  const parsedRequest = parseValidateRequestBody(body);
  if (!parsedRequest.ok) {
    res.writeHead(parsedRequest.status);
    res.end(parsedRequest.body);
    return;
  }

  const {code, outputPath: output_path} = parsedRequest;

  console.log(
    `[validate] received code (${code.length} chars), ` +
    `output_path: ${output_path}`,
  );

  // ── Step 1: Fast compile check ───────────────────────────────────────────
  console.log('[validate] step 1 — compile check (Babel/Node.js)');
  const validationFailure = validateGeneratedCode(code);
  if (validationFailure) {
    console.log('[validate] compile/static validation FAILED:\n', validationFailure.payload.errors);
    res.writeHead(validationFailure.status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(validationFailure.payload));
    return;
  }
  console.log('[validate] compile check passed');
  const declaredSettledFrame = getDeclaredSettledFrame(code);
  const astFallbackDuration = computeAnimationDurationFromCode(code);
  const hasValidDeclaredSettledFrame = isValidDeclaredSettledFrame(declaredSettledFrame);
  const hasUsableAstEstimate = astFallbackDuration.settledFrame !== FALLBACK_SETTLED_FRAME;

  // Declared settledFrame is the primary source when it passes the validator contract:
  // - exported as a numeric literal
  // - integer
  // - > 0
  // - <= single-slide max bound
  //
  // AST is used as:
  // - the fallback when declared settledFrame is missing/invalid
  // - a debug-only sanity check when both values are available
  if (hasValidDeclaredSettledFrame && hasUsableAstEstimate) {
    const delta = Math.abs(declaredSettledFrame - astFallbackDuration.settledFrame);
    if (delta > 30) {
      console.warn(
        `[validate] duration mismatch: declared=${declaredSettledFrame} ast=${astFallbackDuration.settledFrame}`,
      );
    }
  }

  const settledFrame = hasValidDeclaredSettledFrame
    ? declaredSettledFrame
    : astFallbackDuration.settledFrame ?? FALLBACK_SETTLED_FRAME;
  const durationInFrames = hasValidDeclaredSettledFrame
    ? declaredSettledFrame + TAIL_BUFFER
    : astFallbackDuration.durationInFrames ?? FALLBACK_DURATION_IN_FRAMES;
  console.log(
    `[validate] duration resolved: settledFrame=${settledFrame}, durationInFrames=${durationInFrames}, source=${
      hasValidDeclaredSettledFrame ? 'declared' : 'ast-fallback'
    }`,
  );

  const uniqueComponentName = `Component${randomUUID().replace(/-/g, '')}`;
  const idsGcsPath = `${output_path}/${uniqueComponentName}.tsx`;
  const transformedGcsPath = `${output_path}/Transformed${uniqueComponentName}.tsx`;

  // ── AST pass: assign IDs + extract initial overlay ─────────────────────
  // Run on import-stripped code so the AST pass sees clean JSX.
  console.log('[validate] running AST pass (ID assignment + prop extraction)');

  const { code: codeWithAssignedIds, initialOverlay } = assignPrimitiveIds(code);
  let stripped = codeWithAssignedIds;
  stripped = stripped.replace(/import\s+type\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/import\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/import\s+\w+\s+from\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/import\s*["'][^"']+["'];?/g, '');
  stripped = stripped.replace(/^export\s+default\s+/gm, '');
  stripped = stripped.replace(/^export\s+/gm, '');
  stripped = stripped.trim();

  const transformedCode = transformAssignedPrimitiveIds(stripped);

  // ── Compile check (validates the transformed code runs without errors) ──
  console.log('[validate] compiling transformed code for validation...');
  const result = compileRemoteComponent(transformedCode);
  if (result.error) {
    console.log('[validate] compile check FAILED:\n', result.error);
    res.writeHead(422, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error_type: 'compile_error', errors: [result.error]}));
    return;
  }

  // ── Step 2: Render check via Remotion renderStill ────────────────────────
  const uuid = randomUUID();
  const tmpFolder = `generated/_tmp_${uuid}`;
  const templatesDir = resolve(TEMPLATES_DIR, tmpFolder);
  const stillOutput = `/tmp/${uuid}.png`;

  try {
    await mkdir(templatesDir, {recursive: true});

    await writeFile(
      resolve(templatesDir, 'root.tsx'),
      buildRootEntry(code, durationInFrames),
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

    console.log('[validate] bundling complete — selecting composition');
    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: 'ValidatorComp',
      inputProps: {},
      chromiumOptions,
    });

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

    await uploadToGCS(OUTPUT_BUCKET, idsGcsPath, Buffer.from(codeWithAssignedIds, 'utf8'));
    await uploadToGCS(OUTPUT_BUCKET, transformedGcsPath, Buffer.from(transformedCode, 'utf8'));

    console.log('[validate] render check passed — validation complete');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      initialOverlay,
      componentName: uniqueComponentName,
      codeWithAssignedIdsPath: `https://storage.googleapis.com/${OUTPUT_BUCKET}/${idsGcsPath}`,
      transformedCodePath: `https://storage.googleapis.com/${OUTPUT_BUCKET}/${transformedGcsPath}`,
      duration: {
        settledFrame,
        durationInFrames,
        astSettledFrame: astFallbackDuration.settledFrame,
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

export async function handleValidatorRequest(req, res) {
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
}

export function createValidatorServer() {
  return createServer(async (req, res) => {
    await handleValidatorRequest(req, res);
  });
}

const server = createValidatorServer();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, () => {
    console.log(`[validate] server listening on port ${PORT}`);
  });
}
