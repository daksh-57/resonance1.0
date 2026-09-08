# Changelog

All notable changes to ReconcileAI are documented in this file.

## [1.1.0] — 2026-09-07 — Production Readiness & Bug Fixes

### Critical Bugs Fixed

- **API key authentication** now attributes actions to the key creator instead of the first user in the organization
- **Rules page** no longer deletes all field authority rules on save; existing rules are preserved
- **Confirm/reject match** now updates only proposed matches, not all matches for an entity
- **Entity status** updates to "reconciled" when all conflicts are resolved via human decision
- **Demo load endpoint** returns immediately and processes asynchronously instead of blocking the HTTP request
- **Double normalization** in import processor eliminated (performance fix)

### High-Priority UI Fixes

- **Datasets page** now displays source name instead of raw UUID
- **Schedules page** now displays source name instead of raw UUID
- **Notifications dropdown** fetches and displays real notifications from the API with unread count badge
- **Upload page** shows job progress polling after import starts
- **Conflict detail** value comparison correctly highlights recommended values
- **ForgotPassword/ResetPassword** pages now use the centralized API client

### New Features

- **Search page** with real-time search across entities, conflicts, and sources
- **Keyboard shortcut** `/` to open search from anywhere
- **Pagination controls** added to Entities and Conflicts list pages
- **File download endpoint** added for uploaded files
- **Dockerfile** created for production deployment
- **docker-compose.yml** updated with API service, health checks, and persistent volumes
- **Dashboard charts** using Recharts: records by source (bar), conflicts by severity (pie)
- **Entity Detail page** enhanced with tabbed interface (Source Records, Conflicts, Canonical, Audit)

### Security Improvements

- `CORS_ORIGIN` now trimmed and validated, falls back to default if empty
- API key auth uses `createdBy` field for proper audit attribution
- Session and API key isolation enforced at query level

### Documentation

- `docs/AUDIT_REPORT.md` — Full codebase audit with 25+ findings
- `docs/TEST_REPORT.md` — Comprehensive test results
- `DEPLOYMENT.md` — Updated with Docker production setup

### Verification

- TypeScript typecheck: **PASS** (all 4 packages)
- Unit tests: **10/10 PASS** (6 engine + 4 API)
- Build: **PASS** (web + API)

---

## [1.0.0] — 2026-09-07 — Initial Release

- Full-stack monorepo with React 19 frontend, Express 5 backend, PostgreSQL 16
- Reconciliation engine with normalization, matching, conflict detection, confidence scoring
- File upload (CSV/XLSX/JSON) with parsing and validation
- Background job processing with Postgres-backed queue
- Demo data with 150+ records across 3 sources
- 22 frontend pages with routing, auth, and API client
- 24 database tables with proper FKs, indexes, and constraints
