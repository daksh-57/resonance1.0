# ReconcileAI — Architecture

## Overview

ReconcileAI is a single integrated full-stack application for intelligent digital record reconciliation. It covers Phases 1–4: ingest → normalize → match/detect conflicts → canonical/review/audit → learning/APIs/schedules.

## Components

```
Browser (React SPA)
    │  cookie session  OR  Authorization: Bearer rai_...
    ▼
Express API  (:4000)  ──►  PostgreSQL
    │                    ──►  local/object file storage (STORAGE_DIR)
    │
    ├── Auth + org isolation
    ├── Upload / mapping / validation
    ├── Job queue (Postgres-backed) + in-process worker
    └── packages/engine  (pure functions)
```

### Frontend — `apps/web`
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4
- React Router 7
- TanStack Query v5
- Recharts v3

### Backend — `apps/api`
- Node 20+ / Express 5
- Drizzle ORM + PostgreSQL 16
- `postgres` driver (connection pool)
- Session cookies + API keys
- Multer for uploads
- Background jobs via `reconciliation_jobs` table + polling worker

### Engine — `packages/engine`
Pure TypeScript functions for:
- Normalization
- Similarity (Jaro–Winkler, token set)
- Entity matching / clustering
- Conflict detection
- Reconciliation / recommendation
- Confidence scoring
- Feedback / logistic regression

### Shared — `packages/shared`
Constants, enums, Zod DTOs, thresholds, header aliases shared between API and web.

## Data Flow

1. **Ingest**: User uploads CSV/XLSX/JSON or loads demo data.
2. **Preserve**: Original bytes saved to disk; raw JSON stored in `source_records.raw`.
3. **Normalize**: `normalized_records` stores comparable forms without mutating raw.
4. **Match**: Engine clusters records by email/phone/customer_id + fuzzy name/address.
5. **Conflict**: Per entity, per field, distinct normalized values detected.
6. **Recommend**: Weighted scoring (agreement, authority, reliability, recency, completeness).
7. **Resolve**: High-confidence auto-resolved; low-confidence queued for human review.
8. **Canonical**: One canonical record per entity with evidence snapshots.
9. **Audit**: Every action logged to `audit_events`.
10. **Learn**: Human decisions feed `model_feedback`; logistic regression trains after ≥20 rows.

## Isolation

- Every query scoped by `organization_id` from session or API key.
- Users cannot access another org's data by ID manipulation.
- Organizations created on registration; users belong to one org.

## Storage

- **Database**: PostgreSQL 16 with 20+ relational tables.
- **Files**: Disk storage under `STORAGE_DIR/{orgId}/{fileId}`. Swap to S3 by replacing `apps/api/src/lib/storage.ts`.
- **Sessions**: `sessions` table with httpOnly cookies.

## Background Jobs

- Jobs stored in `reconciliation_jobs`.
- API process polls every 1.5s; optional `npm run worker` runs a second process polling every 1s.
- No Redis required.

## LLM Integration (Optional)

- If `LLM_API_KEY` is set, explanations can be polished by an OpenAI-compatible API.
- Engine fully functional without LLM.
