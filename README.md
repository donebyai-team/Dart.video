## 🏗️ Folder Overflow

This repository contains all components required to run a GRPC golang backend and NextJS frontend.

```
.
├── backend/             # Go backend services
│   ├── portal-api/      # Public API layer for frontend (gRPC + Connect)
│   └── spooler/         # Core tracking engine for subreddits and posts
├── frontend/            # Frontend mono-repo
│   ├── portal/          # Web app (Next.js + PNPM)
│   └── packages/        # Shared UI, config, and protobuf packages
└── devel/               # Local development setup scripts
```


## 🧰 Tech Stack

**Backend**

- Go `1.23+`
- PostgreSQL
- Redis
- Docker

**Frontend**

- Node.js `20+`
- PNPM
- Next.js / React
- Tailwind CSS / Material UI

**Auth & APIs**

- Auth0 (passwordless login)
---

## ⚙️ Getting Started

### Prerequisites

Ensure you have installed:

- Docker
- Go `1.23+`
- Node.js `20+`
- PNPM
- [direnv](https://direnv.net/) for environment variables

---

### Configuration

Start local PostgreSQL and Redis:

```bash
./devel/up.sh
```

Copy the environment file and configure:

```bash
cp .envrc.example .envrc
direnv allow
```

Replace placeholders (`<value>`) with your actual secrets and keys.

---

Initialize the database:

```bash
./backend/script/migrate.sh up
```

### Backend Setup

Run tests and start the backend:

```bash
cd backend/cmd/coasterai
go build -o coasterai && ./coasterai start
```

For tests
```bash
go test ./...
```

Create a new migration:

```bash
./backend/script/migrate.sh new <migration_name>
```

---

### Frontend Setup

Install dependencies:

```bash
cd frontend
pnpm install
```

Start the development server:

```bash
pnpm dev:portal
```

Visit: [http://localhost:3000](http://localhost:3000)

---

### Running the Project

You’ll need three components running:

1. **Docker** — for Postgres, Redis, Pub/Sub emulator
   ```bash
   ./devel/up.sh
   ```
2. **Backend** — use [reflex](https://github.com/cespare/reflex) for live reload
   ```bash
   reflex -c .reflex
   ```
3. **Frontend** — Next.js app
   ```bash
   cd frontend && pnpm dev:portal
   ```

Visit:

- `http://localhost:8081` → pgweb (Postgres UI)
- `http://localhost:3000` → Redora Portal

---

## 🔌 Integrations

Integrations store external service credentials and configuration.

| Type               | Description                                 |
| ------------------ | ------------------------------------------- |
| **Reddit Cookies** | User-provided cookies for Reddit automation |
| **Slack Webhook**  | Notifications and alerts                    |
| **OAuth Tokens**   | Reddit access/refresh tokens                |

**Manually insert an integration using tools. Example (CLI):**

```bash
doota tools integrations slack_webhook create <org-id> '{"channel":"redora-alerts","webhook":"<slack-url>"}'
```
---

## 🛠️ Admin Interface

There is no separate admin interface. Users assigned the role `PLATFORM_ADMIN` can view all organizations and have access to all accounts across the platform.

## Sync Templates
```
 ./backend/coasterai tools templates sync frontend/packages/templates
```
