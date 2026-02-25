#!/usr/bin/env bash
set -euo pipefail

# Idempotent deploy for Remotion Cloud Run Job using local Docker build/push.
# Re-run this script after code changes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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

PROJECT_ID="${PROJECT_ID:-redora}"
REGION="${REGION:-asia-east1}"
JOB_NAME="${JOB_NAME:-remotion-renderer}"
REPO_NAME="${REPO_NAME:-remotion-jobs}"
IMAGE_NAME="${IMAGE_NAME:-remotion-renderer}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
OUTPUT_BUCKET="${OUTPUT_BUCKET:-${PROJECT_ID}-coasterai-videos}"
REDIS_URL="${REDIS_URL:-redis://default:tStqIhSHLVXIYDpPcScDOVMSvSFltQIk@tramway.proxy.rlwy.net:46709}"
JOB_SA="${JOB_SA:-remotion-job-sa}"
TASK_TIMEOUT="${TASK_TIMEOUT:-3600s}"
JOB_MEMORY="${JOB_MEMORY:-16Gi}"
JOB_CPU="${JOB_CPU:-4}"
TASK_DISK_SIZE="${TASK_DISK_SIZE:-10Gi}"
PUBLIC_BUCKET="${PUBLIC_BUCKET:-false}"
BUCKET_LOCATION="${BUCKET_LOCATION:-$REGION}"

if [[ -z "$REDIS_URL" ]]; then
  echo "error: REDIS_URL is required (e.g. redis://host:6379)" >&2
  exit 1
fi

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:$IMAGE_TAG"
JOB_SA_EMAIL="$JOB_SA@$PROJECT_ID.iam.gserviceaccount.com"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

resource_exists() {
  "$@" >/dev/null 2>&1
}

log "Using PROJECT_ID=$PROJECT_ID REGION=$REGION JOB_NAME=$JOB_NAME OUTPUT_BUCKET=$OUTPUT_BUCKET REDIS_URL=$REDIS_URL"

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

log "Ensuring object write permission for job service account"
gcloud storage buckets add-iam-policy-binding "gs://$OUTPUT_BUCKET" \
  --member="serviceAccount:$JOB_SA_EMAIL" \
  --role="roles/storage.objectAdmin" \
  --project="$PROJECT_ID" >/dev/null

log "Configuring Docker auth for Artifact Registry"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet >/dev/null

log "Building and pushing linux/amd64 image: $IMAGE_URI"
docker buildx build \
  --platform linux/amd64 \
  -f "$ROOT_DIR/Dockerfile.remotion-job" \
  -t "$IMAGE_URI" \
  --push \
  "$ROOT_DIR"

if resource_exists gcloud run jobs describe "$JOB_NAME" --region="$REGION" --project="$PROJECT_ID"; then
  log "Updating existing Cloud Run Job: $JOB_NAME"
  gcloud run jobs update "$JOB_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$IMAGE_URI" \
    --service-account="$JOB_SA_EMAIL" \
    --max-retries=1 \
    --task-timeout="$TASK_TIMEOUT" \
    --memory="$JOB_MEMORY" \
    --cpu="$JOB_CPU" \
    --task-ephemeral-storage="$TASK_DISK_SIZE" \
    --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REDIS_URL=$REDIS_URL,REMOTION_COMPOSITION_ID=MyComposition"
else
  log "Creating Cloud Run Job: $JOB_NAME"
  gcloud run jobs create "$JOB_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$IMAGE_URI" \
    --service-account="$JOB_SA_EMAIL" \
    --max-retries=1 \
    --task-timeout="$TASK_TIMEOUT" \
    --memory="$JOB_MEMORY" \
    --cpu="$JOB_CPU" \
    --task-ephemeral-storage="$TASK_DISK_SIZE" \
    --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET,REDIS_URL=$REDIS_URL,REMOTION_COMPOSITION_ID=MyComposition"
fi

log "Done. Execute renders with:"
echo "gcloud run jobs execute $JOB_NAME --project=$PROJECT_ID --region=$REGION --wait --update-env-vars=RENDER_INPUT_PROPS_B64=<BASE64_JSON>"
