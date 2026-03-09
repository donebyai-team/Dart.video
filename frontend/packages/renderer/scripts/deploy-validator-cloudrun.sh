#!/usr/bin/env bash
set -euo pipefail

# Idempotent deploy for the Remotion Validator Cloud Run Service using local Docker build/push.
# Uses the same Docker image as deploy-remotion-cloudrun.sh (Dockerfile.remotion-job).
# Re-run this script after code changes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RENDERER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud is required" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required" >&2
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "error: docker buildx is required" >&2
  exit 1
fi

# ---- Variables (shared with deploy-remotion-cloudrun.sh) ----
PROJECT_ID="${PROJECT_ID:-redora}"
REGION="${REGION:-asia-east1}"
REPO_NAME="${REPO_NAME:-remotion-jobs}"
IMAGE_NAME="${IMAGE_NAME:-remotion-renderer}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
OUTPUT_BUCKET="${OUTPUT_BUCKET:-coasterai-public}"
JOB_SA="${JOB_SA:-remotion-job-sa}"
PUBLIC_BUCKET="${PUBLIC_BUCKET:-false}"
BUCKET_LOCATION="${BUCKET_LOCATION:-$REGION}"

# ---- Validator-specific variables ----
SERVICE_NAME="${SERVICE_NAME:-remotion-validator}"
SERVICE_MEMORY="${SERVICE_MEMORY:-8Gi}"
SERVICE_CPU="${SERVICE_CPU:-4}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-5}"

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:$IMAGE_TAG"
JOB_SA_EMAIL="$JOB_SA@$PROJECT_ID.iam.gserviceaccount.com"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

resource_exists() {
  "$@" >/dev/null 2>&1
}

log "Using PROJECT_ID=$PROJECT_ID REGION=$REGION SERVICE_NAME=$SERVICE_NAME OUTPUT_BUCKET=$OUTPUT_BUCKET"

log "Enabling required APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

if resource_exists gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID"; then
  log "Artifact Registry repository already exists: $REPO_NAME"
else
  log "Creating Artifact Registry repository: $REPO_NAME"
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Remotion render job images" \
    --project="$PROJECT_ID"
fi

if resource_exists gcloud storage buckets describe "gs://$OUTPUT_BUCKET" --project="$PROJECT_ID"; then
  log "Bucket already exists: gs://$OUTPUT_BUCKET"
else
  log "Creating bucket: gs://$OUTPUT_BUCKET"
  gcloud storage buckets create "gs://$OUTPUT_BUCKET" \
    --location="$BUCKET_LOCATION" \
    --uniform-bucket-level-access \
    --project="$PROJECT_ID"
fi

if [[ "$PUBLIC_BUCKET" == "true" ]]; then
  log "Ensuring public object read on gs://$OUTPUT_BUCKET"
  gcloud storage buckets add-iam-policy-binding "gs://$OUTPUT_BUCKET" \
    --member="allUsers" \
    --role="roles/storage.objectViewer" \
    --project="$PROJECT_ID" >/dev/null
fi

if resource_exists gcloud iam service-accounts describe "$JOB_SA_EMAIL" --project="$PROJECT_ID"; then
  log "Service account already exists: $JOB_SA_EMAIL"
else
  log "Creating service account: $JOB_SA_EMAIL"
  gcloud iam service-accounts create "$JOB_SA" \
    --display-name="Remotion Cloud Run Job" \
    --project="$PROJECT_ID"
fi

log "Ensuring object write permission for service account"
gcloud storage buckets add-iam-policy-binding "gs://$OUTPUT_BUCKET" \
  --member="serviceAccount:$JOB_SA_EMAIL" \
  --role="roles/storage.objectAdmin" \
  --project="$PROJECT_ID" >/dev/null

log "Configuring Docker auth for Artifact Registry"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet >/dev/null

CACHE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:buildcache"

log "Building and pushing linux/amd64 image: $IMAGE_URI"
docker buildx build \
  --platform linux/amd64 \
  -f "$RENDERER_DIR/Dockerfile.remotion-job" \
  -t "$IMAGE_URI" \
  --cache-from "type=registry,ref=$CACHE_URI" \
  --cache-to "type=registry,ref=$CACHE_URI,mode=max" \
  --push \
  "$ROOT_DIR"

log "Deploying Cloud Run Service: $SERVICE_NAME"
gcloud run deploy "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_URI" \
  --service-account="$JOB_SA_EMAIL" \
  --memory="$SERVICE_MEMORY" \
  --cpu="$SERVICE_CPU" \
  --min-instances="$MIN_INSTANCES" \
  --max-instances="$MAX_INSTANCES" \
  --allow-unauthenticated \
  --command="pnpm" \
  --args="run,validate:server"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')"

log "Done. Validator service URL: $SERVICE_URL"
echo "Set in your Go backend: ANIMATION_VALIDATOR_URL=$SERVICE_URL"
