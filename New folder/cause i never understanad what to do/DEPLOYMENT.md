# ReconcileAI — Deployment

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- A real `DATABASE_URL` and strong `SESSION_SECRET` in production.

## Local Development

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000

## Production Build

```bash
npm run build
npm run start
```

The API serves the built React SPA from `apps/web/dist` when `NODE_ENV=production`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | |
| `PORT` | No | `4000` | |
| `DATABASE_URL` | **Yes** | `postgres://reconcile:reconcile@localhost:5432/reconcile` | PostgreSQL connection |
| `SESSION_SECRET` | **Yes** | `dev-only-change-me` | Long random base64url string |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Exact frontend origin |
| `STORAGE_DIR` | No | `./storage` | Uploaded file storage path |
| `MAX_UPLOAD_MB` | No | `25` | |
| `MATCH_AUTO_THRESHOLD` | No | `0.90` | |
| `MATCH_REVIEW_THRESHOLD` | No | `0.70` | |
| `AUTO_RESOLVE_THRESHOLD` | No | `0.85` | |
| `DEFAULT_COUNTRY_CODE` | No | `+91` | |
| `LLM_PROVIDER` | No | `none` | `none` or `openai` |
| `LLM_API_KEY` | No | — | |
| `LLM_MODEL` | No | `gpt-4o-mini` | |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | |
| `SMTP_HOST` | No | — | |
| `SMTP_PORT` | No | `587` | |
| `SMTP_USER` | No | — | |
| `SMTP_PASS` | No | — | |
| `SMTP_FROM` | No | — | |

## Docker Production

```bash
docker compose up --build
```

The `docker-compose.yml` now includes the API service with PostgreSQL health checks and persistent volumes.

## Security Checklist

- [ ] `SESSION_SECRET` is a strong random value
- [ ] `DATABASE_URL` uses a dedicated DB user with limited privileges
- [ ] `CORS_ORIGIN` is set to the exact frontend origin
- [ ] File storage directory is not web-accessible
- [ ] Rate limiting enabled on auth endpoints
- [ ] HTTPS in production (terminate at load balancer)
- [ ] API keys stored as SHA-256 hashes only
- [ ] `NODE_ENV=production` set in container
- [ ] API key `createdBy` field used for audit attribution

## Database Migrations

```bash
npm run db:migrate
```

Migrations are SQL files in `apps/api/src/db/migrations/`.

## Seed Data

```bash
npm run db:seed
```

Creates demo user `demo@reconcile.ai` / `DemoPass123!` and sample CSV/JSON files in `data/demo`.
