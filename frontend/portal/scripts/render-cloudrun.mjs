import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';

const bucket = process.env.OUTPUT_BUCKET;
if (!bucket) {
  throw new Error('Missing required env var OUTPUT_BUCKET');
}

const compositionId = process.env.REMOTION_COMPOSITION_ID || 'MyComposition';
const entryFile = process.env.REMOTION_ENTRY_FILE || 'src/render/index.ts';

const encodedProps = process.env.RENDER_INPUT_PROPS_B64;
const rawProps = process.env.RENDER_INPUT_PROPS_JSON;

if (!encodedProps && !rawProps) {
  throw new Error('Provide one of RENDER_INPUT_PROPS_B64 or RENDER_INPUT_PROPS_JSON');
}

const propsJson = encodedProps
  ? Buffer.from(encodedProps, 'base64').toString('utf8')
  : rawProps;

let inputProps;
try {
  inputProps = JSON.parse(propsJson);
} catch (error) {
  throw new Error(`Invalid render props JSON: ${error.message}`);
}

const videoId = String(inputProps.id || inputProps.video_id || '').trim();
const version = String(inputProps.version || '').trim();

if (!videoId) {
  throw new Error('Input props must include videoId (or id)');
}

if (!version) {
  throw new Error('Input props must include version');
}

const outputFile = `/tmp/${videoId}-${version}.mp4`;
const destination = `${videoId}/${version}.mp4`;

console.log('Starting render', {
  compositionId,
  entryFile,
  outputFile,
  videoId,
  version,
  bucket,
  destination,
});

await new Promise((resolve, reject) => {
  const child = spawn(
    'pnpm',
    [
      'exec',
      'remotion',
      'render',
      entryFile,
      compositionId,
      outputFile,
      '--props',
      propsJson,
    ],
    {stdio: 'inherit'},
  );

  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`Remotion render failed with exit code ${code}`));
  });

  child.on('error', reject);
});

if (!existsSync(outputFile)) {
  throw new Error(`Rendered output not found at ${outputFile}`);
}

const getAccessToken = async () => {
  const tokenRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {
      headers: {'Metadata-Flavor': 'Google'},
    },
  );

  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
};

const fileBuffer = await readFile(outputFile);
const accessToken = await getAccessToken();

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
