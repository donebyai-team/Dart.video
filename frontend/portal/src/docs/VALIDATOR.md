# Animation Validator Service

Validates LLM-generated Remotion template components before they are used in production.
Runs as a **Cloud Run Service** (HTTP, always-on) — distinct from the render Cloud Run Job.

## What it does

Given generated TSX component code, it:

1. **Compiles** the component to a CDN JS bundle (webpack + swc, same pipeline as `build-component.mjs`)
2. **Renders** a single still frame (frame 0) via Remotion's `renderStill()` — confirms no runtime errors
3. **Uploads** the compiled CDN JS to GCS at `<output_path>/<ComponentName>.cdn.js`
4. Returns the GCS path on success, or structured error details on failure

---

## API

```
POST /validate
```

**Request body** (JSON):

| Field            | Type            | Required | Description                                                                |
| ---------------- | --------------- | -------- | -------------------------------------------------------------------------- |
| `code`           | `string`        | ✅       | Full TSX source of the generated component                                 |
| `component_name` | `string`        | ✅       | PascalCase name used as file + export (e.g. `"TextCascade"`)               |
| `output_path`    | `string`        | ✅       | GCS path prefix (e.g. `"templates/abc123"`)                                |
| `config`         | `object`        | ❌       | Template config JSON passed as `props` to the component during renderStill |

**Response — success `200`**:

```json
{ "js_path": "templates/abc123/TextCascade.cdn.js" }
```

**Response — build/render failure `422`** (feed back to LLM):

```json
{
  "error_type": "build_error",
  "errors": ["Module not found: Can't resolve '../../lib/MissingComponent'"]
}
```

```json
{
  "error_type": "render_error",
  "errors": ["TypeError: Cannot read properties of undefined (reading 'text')"]
}
```

**Response — infra failure `500`**: plain text, do NOT feed to LLM.

**`GET /health`** — returns `200 ok` (Cloud Run health check).

---

## Error types

| HTTP | `error_type`   | Feed to LLM? | Cause                                                    |
| ---- | -------------- | ------------ | -------------------------------------------------------- |
| 422  | `build_error`  | ✅ Yes       | Webpack/TypeScript compilation failure                   |
| 422  | `render_error` | ✅ Yes       | React or Remotion runtime error during frame 0 rendering |
| 500  | —              | ❌ No        | GCS upload failure, Node.js crash, missing env vars      |

---

## Go usage

```go
svc := agent.NewAnimationValidatorService(os.Getenv("ANIMATION_VALIDATOR_URL"))

out, err := svc.ValidateAndBuild(ctx, &agent.ValidateAndBuildInput{
    Code:          generatedTSX,
    ComponentName: "TextCascade",
    OutputPath:    "templates/" + templateID,
    Config:        configMap,
})

var buildErr *agent.BuildError
if errors.As(err, &buildErr) {
    // Feed buildErr.Errors back to the LLM for self-correction
    return buildErr
}
if err != nil {
    // Infrastructure error — log it, don't send to LLM
    return fmt.Errorf("validator service unavailable: %w", err)
}

// out.JSPath is the GCS path of the uploaded CDN JS
```

---

## Component code conventions

The LLM must generate components that follow these rules:

### Export name

The component must export a named `RemoteComponent`:

```tsx
export { RemoteComponent }
```

### Props interface

```tsx
interface Props {
  props: YourTemplateConfig  // the config JSON from the request
  onChange: (newProps: YourTemplateConfig) => void
}

const RemoteComponent = ({ props, onChange }: Props) => { ... }
```

### Lib imports

Place the generated component at depth `text-animation/<name>/Component.tsx` mentally.
The validator places it at `packages/templates/generated/_tmp_<uuid>/Component.tsx`.
Import lib utilities with:

```tsx
import { EditableText } from '../../lib/EditableText'
```

(`../../lib/` resolves to `packages/templates/lib/` from the temp folder.)

---

## Temp file lifecycle

Each request creates and **always removes** a temp folder:

```
packages/templates/generated/_tmp_<uuid>/   ← created at request start
  ├── <ComponentName>.tsx                     ← generated code written here
  └── root.tsx                                ← auto-generated Remotion entry
                                              ← deleted in finally{} after response
```

The `generated/` parent directory persists but stays empty between requests.
The still image at `/tmp/<uuid>.png` is also cleaned up after each request.

---

## Deploying

Same Docker image as the render job (`Dockerfile.remotion-job`), different `CMD`.

```bash
gcloud run deploy remotion-validator \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest" \
  --service-account="$JOB_SA_EMAIL" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --command="pnpm" \
  --args="run,validate:server" \
  --set-env-vars="OUTPUT_BUCKET=$OUTPUT_BUCKET" \
  --memory=8Gi \
  --cpu=4 \
  --min-instances=0 \
  --max-instances=5
```

Set `ANIMATION_VALIDATOR_URL` in the Go backend to the Cloud Run Service URL.

---

## Running locally

```bash
cd frontend/portal
OUTPUT_BUCKET=your-bucket PORT=8080 node ../scripts/validate-server.mjs
```

Then test with:

```bash
curl -X POST http://localhost:8080/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "import {useCurrentFrame} from '\''remotion'\''\nexport const RemoteComponent = ({props, onChange}) => <div>{props.text}</div>",
    "component_name": "SimpleText",
    "output_path": "templates/test",
    "config": {"text": "Hello world"}
  }'
```
