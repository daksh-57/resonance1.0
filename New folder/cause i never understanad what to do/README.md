# ReconcileAI — Intelligent Digital Record Reconciliation Platform

**Principle: RECONCILE, DON'T OVERWRITE.** Original source records are never deleted or mutated. Canonical values are derived, explained, and audited.

This repository is a **single integrated application** covering Phases 1–4 (ingest → conflicts → canonical/review/audit → learning/APIs/schedules). It is not four apps.

Use this README as the **build and continuation guide** for another coding assistant. If something is missing, implement it here — do not start a second project.

---

## What another assistant must know before changing code

1. **Monorepo (npm workspaces)**
   - `apps/api` — Express 5 + Drizzle + PostgreSQL. All security, jobs, storage, REST.
   - `apps/web` — React 19 + Vite + Tailwind v4. UI only; never trust the client for authz.
   - `packages/engine` — Deterministic reconciliation (normalize, match, conflict, score, explain, feedback/ML). **No I/O.**
   - `packages/shared` — Canonical field names, thresholds, Zod DTOs, enums shared by API and web.
2. **Never hard-code demo results in the UI.** Demo data is real CSV/XLSX/JSON processed by the same pipeline.
3. **Never destroy `source_records.raw`.** Normalization lives in `normalized_records` / `field_values`.
4. **Every query is scoped by `organization_id` from the session or API key.** IDOR is a bug.
5. **LLM is optional.** If `LLM_API_KEY` is missing, explanations and matching still work.
6. **Do not claim an ML model is trained** unless `model_feedback` has enough rows and `trainFeedbackModel()` actually ran. UI must show `modelVersion` or “deterministic (untrained)”.
7. After each major change: run engine tests, then exercise upload → duplicates → conflict approve → canonical → audit.

---

## Product objective (PS 3)

Organizations ingest CRM / ERP / Billing / HR / files / APIs. The system:

1. Ingests and **preserves** every original record  
2. Normalizes comparable representations  
3. Detects probable duplicate **entities**  
4. Detects **field-level** conflicts (missing ≠ conflict)  
5. Scores confidence, recommends a canonical value, **explains why**  
6. Auto-resolves high confidence; queues the rest for humans  
7. Writes canonical records + immutable-style **audit trail**  
8. Learns from reviewer decisions (Phase 4)  
9. Exposes authenticated APIs, API keys, scheduled imports, dashboards  

---

## Architecture

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

**Background jobs:** `reconciliation_jobs` + `job_logs`. The API process polls and runs jobs (no Redis required). You can also run `npm run worker` as a second process. Documented tradeoff vs Bull/Redis: fewer moving parts for deployment; swap later if needed.

**File storage:** uploaded bytes on disk under `STORAGE_DIR/{orgId}/{fileId}` plus `uploaded_files` metadata. Swap to S3-compatible storage by replacing `apps/api/src/storage.ts` only.

---

## Technology stack

| Layer | Choice | Why |
|--------|--------|-----|
| Frontend | React 19, TS, Vite, Tailwind 4, TanStack Query, Recharts, React Router 7 | Supported, typed, fast |
| Backend | Node 20+, Express 5, Zod, Drizzle ORM, postgres.js | Same language as frontend |
| DB | PostgreSQL 16 | Required relational model |
| Auth | bcryptjs, httpOnly session cookie, `sessions` table | No JWT-in-localStorage |
| Files | Disk (compose volume) | Persist across refresh |
| Engine | In-repo TypeScript | Works without any AI vendor |
| Optional LLM | OpenAI-compatible env vars | Explanations only |

---

## Repository layout

```
apps/api/src/
  index.ts              HTTP server + static SPA in production
  app.ts                Express app (testable)
  worker.ts             Job poller
  config.ts
  db/schema.ts          Drizzle tables (must match SQL)
  db/client.ts
  db/migrate.ts
  db/migrations/001_init.sql
  middleware/auth.ts    Session + API key + requireOrg
  routes/*.ts
  jobs/processor.ts     Import → normalize → match → reconcile
  storage.ts
  audit.ts
  seed/                 Demo user + generators
  llm.ts                Optional; must no-op without key
apps/web/src/
  pages/                One route per spec §22
  components/           Shell, table, badges, toasts, empty states
  lib/api.ts            credentials: 'include'
packages/engine/src/    Pure reconciliation
packages/shared/src/
data/demo/              CRM.csv ERP.csv Billing.csv (+ json/xlsx)
```

---

## Database (required tables)

`users`, `organizations`, `organization_members`, `sessions`, `password_reset_tokens`,  
`sources`, `source_field_rules`, `datasets`, `uploaded_files`,  
`source_records`, `normalized_records`,  
`entities`, `entity_matches`, `field_values`,  
`conflicts`, `reconciliation_decisions`, `review_tasks`,  
`canonical_records`, `canonical_field_values`,  
`audit_events`, `reconciliation_jobs`, `job_logs`,  
`model_feedback`, `model_versions`,  
`api_keys`, `scheduled_imports`, `notifications`.

UUIDs, FKs, timestamps, status columns, indexes on org + search fields. Raw payload as JSONB; searchable facts as columns. **Do not collapse the app into one JSON document.**

Default org `settings` JSON:

- `weights` — name/email/phone/address/dob/customer_id/company  
- `thresholds` — autoMatch 0.90, reviewMatch 0.70, autoResolve 0.90  
- `fieldImportance` — drives LOW/MEDIUM/HIGH/CRITICAL  

---

## Reconciliation algorithm (deterministic)

See `RECONCILIATION.md`. Summary:

**Normalize** (store raw + normalized separately): name fold/collapse; email lower/trim; phone digits + country; address abbrev expansion; dates ISO; numbers parse.

**Match:** blocking on email / phone / customer_id; Jaro–Winkler + token similarity on name/address; weighted sum from org config; union-find clusters. Persist `match_score`, `match_reason`, `matched_fields`, `confidence`, `status`.

**Conflicts:** per entity, per field, distinct normalized values among **present** values only.

**Recommend:** agreement + field authority (`source_field_rules`) + source reliability + recency (half-life) + completeness + optional feedback model. Persist explanation bullets (never “AI said so”).

**Resolve:** confidence ≥ autoResolve → auto + audit `CONFLICT_AUTO_RESOLVED`; else `review_tasks`.

**Canonical:** one row per entity; each field stores value, source, confidence, decision id, evidence snapshot.

**Phase 4:** `model_feedback` rows on every human decision; logistic regression if ≥ 20 labeled rows; bump `model_versions`.

---

## Auth, tenancy, security

- Register creates **user + organization + admin membership**.  
- Session cookie `sid` (httpOnly, SameSite=Lax, Secure in production).  
- Password reset tokens hashed; without SMTP, reset URL returned in JSON in **development only**.  
- API keys: shown once; store SHA-256; prefix `rai_` + `key_prefix` for display.  
- Helmet, rate limits on login/register/API-key, upload type/size checks, parameterized SQL (Drizzle).  
- Users cannot read another org’s rows by swapping UUIDs.

---

## Local development

Prerequisites: Node 20+, Docker (for Postgres).

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173 (proxies `/api` → `:4000`)  
- API: http://localhost:4000  

**Seed login:** `demo@reconcile.ai` / `DemoPass123!`  
Then Dashboard → **Load Demo Dataset** (or seed already loaded).

Tests:

```bash
npm test
npm run typecheck
```

---

## Environment variables

See `.env.example`. Required for real deploy: `DATABASE_URL`, `SESSION_SECRET` (long random), `CORS_ORIGIN` (exact frontend origin). Optional: `LLM_API_KEY`, SMTP, `STORAGE_DIR`.

**You must provide for production:** a strong `SESSION_SECRET` and a real `DATABASE_URL`. LLM key is optional.

---

## Implementation order (if continuing the build)

1. Schema + migrate + seed  
2. Auth + org isolation tests  
3. Sources + field rules  
4. Upload wizard + parsers + row errors  
5. Jobs + normalize + match + conflicts + canonical  
6. Review actions (approve/reject/choose/edit/merge/split) + audit  
7. Dashboard/analytics/search/export  
8. API keys + public REST (same handlers)  
9. Schedules + encrypted endpoint secrets  
10. Feedback model + optional LLM  
11. Docker production serve (API serves `apps/web/dist`)  

---

## Docs

| File | Contents |
|------|----------|
| `ARCHITECTURE.md` | Components, data flow, isolation |
| `API.md` | REST + API keys |
| `RECONCILIATION.md` | Scoring formulas |
| `DEPLOYMENT.md` | Docker / env / checklist |

---

## Phase map

| Phase | Features |
|-------|----------|
| 1 | Sources, upload, mapping, normalize, duplicate groups |
| 2 | Conflicts, severity, confidence, source/field authority |
| 3 | Canonical, evidence, human review, audit |
| 4 | Feedback model, API keys, schedules, analytics, optional LLM |

---

## Non-negotiables (do not regress)

- No fake buttons or placeholder reconciliation  
- No deleting source records  
- No secrets in the frontend  
- No org data leakage  
- Engine must run with `LLM_PROVIDER=none`
