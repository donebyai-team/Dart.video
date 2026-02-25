# Remotion Cloud Run Job Setup

This setup renders a Remotion video in a Cloud Run Job and uploads it to:

`https://storage.googleapis.com/<OUTPUT_BUCKET>/<video_id>/<version>.mp4`

The `video_id` and `version` come from the `Video` proto passed by the Go backend.

## Architecture

```
Go backend
  └─ SubmitJob()          → submits Cloud Run Job with RENDER_INPUT_PROPS_B64
       └─ Cloud Run Job
            ├─ renderMedia()   (programmatic, no CLI)  → writes progress to Redis
            └─ uploads MP4 to GCS

Go backend
  └─ PollJob()            → reads render:progress:{videoId}:{version} from Redis
```

**Key files:**

- `portal/scripts/render-cloudrun.mjs` — job entrypoint (programmatic rendering + Redis progress)
- `portal/scripts/prebundle.mjs` — bundles the composition at Docker build time
- `portal/src/render/index.ts` — Remotion composition root
- `backend/services/render_video_service.go` — SubmitJob / PollJob

---

## Fast path (rerunnable single command)

Use the idempotent deploy script at:

- `scripts/deploy-remotion-cloudrun.sh`

**First time only** — update the lockfile after the new packages (`ioredis`,
`@remotion/renderer`, `@remotion/bundler`) were added, then commit it:

```bash
# run from the frontend/ directory (where pnpm-workspace.yaml lives)
cd frontend
pnpm install
git add pnpm-lock.yaml && git commit -m "add ioredis and remotion renderer deps"
```

Set env vars and run:

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export OUTPUT_BUCKET="your-public-video-bucket"
export REDIS_URL="redis://your-redis-host:6379"

# Optional overrides:
# export JOB_NAME="remotion-renderer"
# export REPO_NAME="remotion-jobs"
# export IMAGE_NAME="remotion-renderer"
# export IMAGE_TAG="latest"
# export JOB_SA="remotion-job-sa"
# export PUBLIC_BUCKET="true"

pnpm run deploy:remotion
```

After any code change, run the same command again (no `pnpm install` needed unless
you add more packages):

```bash
pnpm run deploy:remotion
```

The script will create/update all required resources:

- APIs
- Artifact Registry repo
- GCS bucket (and public object read when `PUBLIC_BUCKET=true`)
- Service account and bucket IAM
- Container image build/push (includes pre-bundling the Remotion composition)
- Cloud Run Job create/update

---

## 1) One-time GCP setup

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export JOB_NAME="remotion-renderer"
export REPO_NAME="remotion-jobs"
export IMAGE_NAME="remotion-renderer"
export OUTPUT_BUCKET="your-public-video-bucket"

# Enable required services
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com

# Artifact Registry repo for container images
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Remotion render job images"
```

---

## 2) Update the lockfile (once after adding new packages)

The image build uses `pnpm install --frozen-lockfile`. After the `ioredis`,
`@remotion/renderer`, and `@remotion/bundler` packages were added to
`portal/package.json`, regenerate the lockfile from the workspace root:

```bash
pnpm install
```

Commit the updated `pnpm-lock.yaml` before building the image.

---

## 3) Build and push the job image

Run from the repository root (same folder as `Dockerfile.remotion-job`).

The build runs `pnpm node scripts/prebundle.mjs` inside the image, which
webpack-bundles the Remotion composition to `/app/portal/remotion-bundle`.
The job container starts rendering immediately with no webpack step at runtime.

```bash
gcloud builds submit \
  --project="$PROJECT_ID" \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --file Dockerfile.remotion-job
```

---

## 4) Service account and bucket access

```bash
export JOB_SA="remotion-job-sa"

# Create service account
gcloud iam service-accounts create "$JOB_SA" \
  --project="$PROJECT_ID" \
  --display-name="Remotion Cloud Run Job"

# Allow writing objects to the output bucket
gcloud storage buckets add-iam-policy-binding "gs://$OUTPUT_BUCKET" \
  --member="serviceAccount:$JOB_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

If the bucket should be public, grant object viewer to all users once:

```bash
gcloud storage buckets add-iam-policy-binding "gs://$OUTPUT_BUCKET" \
  --member="allUsers" \
  --role="roles/storage.objectViewer"
```

---

## 5) Create (or update) the Cloud Run Job

`REDIS_URL` must point to the same Redis instance the Go backend uses.
The job writes progress under the key `coasterai:render:progress:{videoId}:{version}`
with a 30-minute TTL.

```bash
export REDIS_URL="redis://your-redis-host:6379"

gcloud run jobs create "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --service-account="$JOB_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --max-retries=1 \
  --task-timeout=3600s \
  --memory=4Gi \
  --cpu=2 \
  --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REDIS_URL=$REDIS_URL,REMOTION_COMPOSITION_ID=MyComposition"
```

If the job already exists:

```bash
gcloud run jobs update "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REDIS_URL=$REDIS_URL,REMOTION_COMPOSITION_ID=MyComposition"
```

---

## 6) Trigger the job (manual test)

Input props are the `Video` proto serialized as protojson (fields at the top level,
`id` + `version` required). The script wraps them as `{ video: props }` internally
before passing to Remotion.

```bash
cat > /tmp/remotion-props.json <<'JSON'
{
  "id": "abc123",
  "version": "1",
  "name": "Test video",
  "metadata": {
    "fps": 30,
    "duration": 12,
    "resolution": {"width": 1280, "height": 720}
  },
  "config": {
    "sections": []
  }
}
JSON

PROPS_B64="$(base64 < /tmp/remotion-props.json | tr -d '\n')"

gcloud run jobs execute "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --wait \
  --update-env-vars="RENDER_INPUT_PROPS_B64=$PROPS_B64"
```

Expected output URL format:

```text
https://storage.googleapis.com/<OUTPUT_BUCKET>/abc123/1.mp4
```

Progress is written to Redis at:

```text
coasterai:render:progress:abc123:1
```

Value (JSON):

```json
{
  "completed": false,
  "render_phase": "rendering",
  "render_current": 150,
  "render_total": 360,
  "render_percent": 41.67,
  "render_eta_seconds": 12
}
```

When done:

```json
{"completed": true, "render_phase": "encoding", "render_percent": 100, ...}
```

On error:

```json
{"completed": false, "error": "reason..."}
```

---

## 7) Trigger from backend (Go API call target)

The Go backend calls `SubmitJob()` in `render_video_service.go`, which:

1. Base64-encodes the protojson-marshalled `Video` proto
2. Submits the Cloud Run Job with `RENDER_INPUT_PROPS_B64` override
3. Caches the execution ID in Redis for 30 minutes

For a raw curl test:

```bash
ACCESS_TOKEN="$(gcloud auth print-access-token)"

curl -X POST \
  "https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/$REGION/jobs/$JOB_NAME:run" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "overrides": {
    "containerOverrides": [
      {
        "env": [
          {"name": "RENDER_INPUT_PROPS_B64", "value": "$PROPS_B64"}
        ]
      }
    ]
  }
}
JSON
```

---

## 8) Polling progress from backend

`PollJob()` in `render_video_service.go`:

1. Reads `render:progress:{videoId}:{version}` from Redis via the existing cache client
2. If the key is missing (job starting up), returns empty progress
3. If `error` field is set, returns an error to the caller
4. Checks the Cloud Run execution status for `FailedCount`/`CancelledCount` (safety net for container crashes that bypass Redis)
5. Checks GCS for the output file as a belt-and-suspenders completion fallback (handles expired Redis TTL)

No Cloud Logging queries are made.
