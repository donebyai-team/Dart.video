import {renderMedia, selectComposition} from '@remotion/renderer';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import Redis from 'ioredis';

// Bundle is pre-built at Docker image build time by scripts/prebundle.mjs
const BUNDLE_DIR = '/app/portal/remotion-bundle';
const PROGRESS_TTL_SECONDS = 30 * 60; // 30 minutes
const KEY_PREFIX = 'coasterai:';

// --- Required env vars ---
const bucket = process.env.OUTPUT_BUCKET;
if (!bucket) throw new Error('Missing required env var OUTPUT_BUCKET');

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('Missing required env var REDIS_URL');

const compositionId = process.env.REMOTION_COMPOSITION_ID || 'MyComposition';

// --- Decode input props ---
const encodedProps = process.env.RENDER_INPUT_PROPS_B64;
if (!encodedProps) throw new Error('Missing required env var RENDER_INPUT_PROPS_B64');

let protoProps;
try {
  protoProps = JSON.parse(Buffer.from(encodedProps, 'base64').toString('utf8'));
} catch (e) {
  throw new Error(`Invalid render props JSON: ${e.message}`);
}

// protoProps is the Video proto JSON (id, name, config, metadata, version, ...)
// version is int64 serialized as string by protojson
const videoId = String(protoProps.id || '').trim();
const version = String(protoProps.version || '').trim();

if (!videoId) throw new Error('Input props must include id');
if (!version) throw new Error('Input props must include version');

const outputFile = `/tmp/${videoId}-${version}.mp4`;
const destination = `${videoId}/${version}.mp4`;

// Wrap proto as { video: ... } so Video.tsx getInputProps()?.video resolves correctly
const inputProps = {video: protoProps};

// --- Redis setup ---
const redis = new Redis(redisUrl, {lazyConnect: false, enableReadyCheck: true});
const progressKey = `${KEY_PREFIX}render:progress:${videoId}:${version}`;

async function writeProgress(data) {
  try {
    await redis.set(progressKey, JSON.stringify(data), 'EX', PROGRESS_TTL_SECONDS);
  } catch (err) {
    console.warn('Redis write failed', err.message);
  }
}

// Cloud Run has no GPU — use SwiftShader (software OpenGL) to avoid Chromium
// falling back to hardware acceleration and triggering Remotion's memory warning.
const chromiumOptions = {
  gl: 'swiftshader',
  disableWebSecurity: true,
};

// --- Main ---
console.log('Starting render', {compositionId, videoId, version, bucket, destination});

await writeProgress({completed: false, render_phase: 'starting', render_percent: 0});

try {
  const composition = await selectComposition({
    serveUrl: BUNDLE_DIR,
    id: compositionId,
    inputProps,
    chromiumOptions,
  });

  console.log('Composition resolved', {
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
  });

  await renderMedia({
    composition,
    serveUrl: BUNDLE_DIR,
    codec: 'h264',
    outputLocation: outputFile,
    inputProps,
    chromiumOptions,
    // Render one frame at a time to keep Chrome's memory footprint predictable.
    // Cloud Run has no GPU so each tab runs SwiftShader (software OpenGL) which
    // is heavier than hardware rendering; concurrency > 1 multiplies that cost.
    concurrency: 1,
    onProgress: ({renderedFrames, encodedFrames, renderEstimatedRemainingTime, progress}) => {
      const phase = encodedFrames > 0 ? 'encoding' : 'rendering';
      const current = encodedFrames > 0 ? encodedFrames : renderedFrames;
      const total = composition.durationInFrames;
      const etaMs = renderEstimatedRemainingTime ?? 0;

      writeProgress({
        completed: false,
        render_phase: phase,
        render_current: current,
        render_total: total,
        render_percent: Math.round(progress * 10000) / 100,
        render_eta_seconds: Math.ceil(etaMs / 1000),
      });
    },
  });

  if (!existsSync(outputFile)) {
    throw new Error(`Rendered output not found at ${outputFile}`);
  }

  // Upload to GCS
  const accessToken = await getAccessToken();
  const fileBuffer = await readFile(outputFile);

  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
    `?uploadType=media&name=${encodeURIComponent(destination)}`;

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileBuffer.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errorText}`);
  }

  const publicUrl = `https://storage.googleapis.com/${bucket}/${destination}`;
  console.log('Render uploaded successfully', {publicUrl, bucket, destination});

  await writeProgress({
    completed: true,
    render_phase: 'encoding',
    render_percent: 100,
    render_current: composition.durationInFrames,
    render_total: composition.durationInFrames,
    render_eta_seconds: 0,
  });
} catch (err) {
  console.error('Render failed', err);
  await writeProgress({completed: false, error: err.message});
  process.exit(1);
} finally {
  await redis.quit();
}

async function getAccessToken() {
  const tokenRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {headers: {'Metadata-Flavor': 'Google'}},
  );
  if (!tokenRes.ok) throw new Error(`Failed to get access token: ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}
