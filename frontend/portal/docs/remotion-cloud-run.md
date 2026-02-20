# Remotion Cloud Run Job Setup

This setup renders a Remotion video in a Cloud Run Job and uploads it to:

`https://storage.googleapis.com/<OUTPUT_BUCKET>/<video_id>/<version>.mp4`

The `video_id` and `version` come from input props.

## Fast path (rerunnable single command)

Use the idempotent deploy script at:

- `scripts/deploy-remotion-cloudrun.sh`

Set env vars and run:

```bash
export PROJECT_ID="redora"
export REGION="us-central1"
export OUTPUT_BUCKET="your-public-video-bucket"

# Optional overrides:
# export JOB_NAME="remotion-renderer"
# export REPO_NAME="remotion-jobs"
# export IMAGE_NAME="remotion-renderer"
# export IMAGE_TAG="latest"
# export JOB_SA="remotion-job-sa"
# export PUBLIC_BUCKET="true"

pnpm run deploy:remotion
```

After any code change, run the same command again:

```bash
pnpm run deploy:remotion
```

The script will create/update all required resources:

- APIs
- Artifact Registry repo
- GCS bucket (and public object read when `PUBLIC_BUCKET=true`)
- Service account and bucket IAM
- Container image build/push
- Cloud Run Job create/update

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

## 2) Build and push the job image

Run from repository root (same folder as `Dockerfile.remotion-job`):

```bash
gcloud builds submit \
  --project="$PROJECT_ID" \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --file Dockerfile.remotion-job
```

## 3) Service account and bucket access

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

## 4) Create (or update) the Cloud Run Job

```bash
gcloud run jobs create "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --service-account="$JOB_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --max-retries=1 \
  --task-timeout=3600s \
  --memory=4Gi \
  --cpu=2 \
  --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REMOTION_COMPOSITION_ID=MyComposition,REMOTION_ENTRY_FILE=src/render/index.ts"
```

If job already exists:

```bash
gcloud run jobs update "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REMOTION_COMPOSITION_ID=MyComposition,REMOTION_ENTRY_FILE=src/render/index.ts"
```

## 5) Trigger the job (manual test)

Create input props JSON. `videoId` and `version` are required by the runner.

```bash
cat > /tmp/remotion-props.json <<'JSON'
{
  "videoId": "abc123",
  "version": "v1",
  "video": {
    "metadata": {
      "fps": 30,
      "duration": 12,
      "resolution": {"width": 1280, "height": 720}
    },
    "slides": []
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
https://storage.googleapis.com/<OUTPUT_BUCKET>/abc123/v1.mp4
```

## 6) Trigger from backend (Go API call target)

Your backend should call Cloud Run Jobs `:run` API and pass env overrides.

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

The cloud job runtime is implemented in:

- `portal/scripts/render-cloudrun.mjs`

It renders via Remotion and uploads the MP4 to the bucket path `<videoId>/<version>.mp4`.

## 7) Frontend trigger payload (to your Go API)

Your frontend only needs to send render input props to your backend endpoint.

```ts
await fetch('/api/render-video', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    videoId: 'abc123',
    version: 'v1',
    video: {
      metadata: {
        fps: 30,
        duration: 12,
        resolution: {width: 1280, height: 720},
      },
      slides: [],
    },
  }),
});
```

Then your Go API can base64-encode this JSON and pass it as `RENDER_INPUT_PROPS_B64` in the Cloud Run Job execution request.
