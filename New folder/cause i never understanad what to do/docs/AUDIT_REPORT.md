# ReconcileAI — Audit Report

**Date:** 2026-09-07  
**Auditor:** Kilo  
**Scope:** Full-stack application audit including frontend, backend, database, engine, tests, and deployment.

---

## Executive Summary

The application has a solid foundation: working PostgreSQL schema, deterministic reconciliation engine, functional file upload pipeline, and a complete React frontend. However, there are **5 critical bugs** that break or corrupt data in production scenarios, several security issues, and missing functionality in the UI.

**Verdict:** The app is usable for demo purposes but is **NOT production-ready** without the fixes listed below.

---

## 1. Working Features

- Database schema: 24 tables, proper FKs, indexes, constraints
- Reconciliation engine: normalization, matching, conflict detection, recommendation
- File upload: CSV/XLSX/JSON parsing with error handling
- Authentication: registration, login, logout, session cookies
- Organization isolation: queries scoped by `organization_id`
- Audit trail: events logged for major actions
- Background jobs: Postgres-backed queue with polling worker
- Demo data: realistic CSV/JSON with duplicates, conflicts, stale records
- Frontend: 22 pages with routing, auth context, API client

---

## 2. Partially Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| API Key Auth | Broken | Attributes actions to wrong user |
| Rules/Settings UI | Broken | Deletes all rules on save |
| Entity Match Actions | Broken | Updates all matches, not just proposed |
| Entity Status | Broken | Never updates after human conflict resolution |
| Demo Load | Broken | Blocks HTTP request synchronously |
| Notifications | Partial | Backend creates, frontend never shows |
| Pagination | Partial | API supports it, UI never uses page controls |
| Job Progress | Partial | API tracks progress, UI never polls |
| File Storage | Partial | Disk-based, no download/delete UI |
| Scheduled Imports | Partial | Backend stub only |

---

## 3. Broken Features

### CRITICAL

1. **API Key Authentication — Wrong User Attribution**
   - File: `apps/api/src/middleware/auth.ts:32`
   - Impact: Audit trails, conflict resolutions, and all actions via API key are attributed to the first user in the organization, not the key creator.
   - Fix: Store `userId` on API keys and use it for auth context.

2. **Rules Page Deletes All Source Field Authority Rules**
   - File: `apps/web/src/pages/Rules.tsx:12` + `apps/api/src/app.ts:379`
   - Impact: Every time a user clicks "Save Settings" in Rules, all field-level authority rules are wiped.
   - Fix: Send existing rules array in PUT request; backend should upsert, not delete-all.

3. **Confirm/Reject Match Updates ALL Matches**
   - File: `apps/api/src/app.ts:560,576`
   - Impact: Confirming or rejecting a match for an entity updates every `entity_match` row, including previously split/rejected ones.
   - Fix: Add `eq(entityMatches.status, "proposed")` to WHERE clause.

4. **Entity Status Never Updates After Human Conflict Resolution**
   - File: `apps/api/src/app.ts:661-744`
   - Impact: After a reviewer approves/rejects/overrides a conflict, the entity remains `needs_review` even when all conflicts are resolved.
   - Fix: Recalculate entity status after conflict resolution.

5. **Demo Load Blocks HTTP Request**
   - File: `apps/api/src/app.ts:1108`
   - Impact: `await runImportAndReconcile()` runs synchronously inside the HTTP handler. For demo datasets (~150 rows × 3 sources), this will timeout or severely lag the browser.
   - Fix: Return job ID immediately; let worker process asynchronously.

### HIGH

6. **No Job Progress Polling in Upload UI**
   - File: `apps/web/src/pages/Upload.tsx`
   - Impact: User sees static "Processing in background" with no visibility into progress.

7. **Datasets Page Shows Raw UUID Instead of Source Name**
   - File: `apps/web/src/pages/Datasets.tsx:33`
   - Impact: Users see `a8ee0866-...` instead of "CRM".

8. **Schedules Page Shows Raw UUID Instead of Source Name**
   - File: `apps/web/src/pages/Schedules.tsx`
   - Impact: Same as above.

9. **ConflictDetail Comparison Miscolors Values**
   - File: `apps/web/src/pages/ConflictDetail.tsx:56`
   - Impact: Recommended value may be shown as "diff" instead of "pick".

10. **ForgotPassword/ResetPassword Use Raw fetch**
    - File: `apps/web/src/pages/ForgotPassword.tsx`, `ResetPassword.tsx`
    - Impact: Bypasses `API_BASE` logic and error handling.

### MEDIUM

11. **Double Normalization Per Row**
    - File: `apps/api/src/jobs/processor.ts:150,171`
    - Impact: Minor performance waste; same row normalized twice.

12. **Conflicts/:id Loads All Source Records for Org**
    - File: `apps/api/src/app.ts:656`
    - Impact: Inefficient query; could be slow with large datasets.

13. **No Cleanup of Expired Sessions/Password Reset Tokens**
    - Impact: Tables grow unbounded.

14. **No CSRF Protection**
    - Impact: State-changing endpoints vulnerable to CSRF.

15. **Migration Runner No Transaction Safety**
    - File: `apps/api/src/db/migrate.ts`
    - Impact: Failed migrations leave database in inconsistent state.

---

## 4. Missing Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Pagination Controls | High | No prev/next in UI |
| Job Progress Polling | High | Upload shows static message |
| File Download/Delete UI | Medium | No way to view uploaded files |
| Reprocess Dataset | Medium | No button to re-run reconciliation |
| Merge Entities | Medium | Only split exists |
| Bulk Actions | Medium | No approve/reject multiple conflicts |
| Saved Filters | Low | No filter persistence |
| API Playground | Low | Docs page shows endpoints but no tester |
| Organization Members UI | Low | Table exists, no endpoints/UI |
| Data Quality Center | Low | No data quality scoring page |
| Source Health | Low | No per-source health metrics |
| Reports | Low | No report generation |
| Global Search Shortcut | Low | No `/` shortcut |
| Notification Center UI | Low | Backend works, frontend static |

---

## 5. Mock/Demo-Only Functionality

- None. The demo data is real CSV/JSON processed by the same pipeline. No mock results in UI.

---

## 6. Security Issues

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| API key auth attributes to wrong user | **HIGH** | `middleware/auth.ts:32` | Store `userId` on key |
| Default `SESSION_SECRET` hardcoded | **HIGH** | `config.ts:12` | Already in .env.example, but enforce in prod |
| `CORS_ORIGIN` empty string blocks all requests | **MEDIUM** | `config.ts` | Validate non-empty |
| `contentSecurityPolicy: false` | **MEDIUM** | `app.ts:88` | Enable with proper directives |
| No CSRF tokens | **MEDIUM** | Global | Add CSRF middleware |
| Password reset token in dev response | **LOW** | `app.ts:188` | Acceptable for dev, document |
| Rate limit shared across auth endpoints | **LOW** | `app.ts:59` | Separate limits per endpoint |

---

## 7. Database Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing index on `source_records.external_id` | LOW | Add index |
| Missing unique constraint on `reconciliation_jobs` | MEDIUM | Add `(datasetId, type, status)` unique constraint |
| No cleanup of expired sessions | LOW | Add periodic cleanup |
| Migration runner not transactional | MEDIUM | Wrap each migration in transaction |

---

## 8. UI/UX Issues

| Issue | File | Fix |
|-------|------|-----|
| Static notifications dropdown | `Shell.tsx` | Fetch from `/api/notifications` |
| Raw UUID in Datasets | `Datasets.tsx` | Fetch source name |
| Raw UUID in Schedules | `Schedules.tsx` | Fetch source name |
| No pagination controls | All list pages | Add prev/next |
| No job progress | `Upload.tsx` | Poll `/api/jobs/:id` |
| No file metadata view | N/A | Add file detail page |
| Inconsistent button types | `Upload.tsx` | Use `type="button"` |

---

## 9. Performance Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| `conflicts/:id` loads all org records | Slow with large datasets | Query only linked records |
| Double normalization per row | Wasted CPU | Normalize once |
| No batch size config for imports | Memory pressure | Make batch size configurable |
| Frontend loads all pages at once | Initial bundle size | Code splitting |

---

## 10. Deployment Issues

| Issue | Fix |
|-------|-----|
| `docker-compose.yml` missing API service | Add API service |
| No healthcheck for API | Add healthcheck |
| No volume for file storage | Add storage volume |
| No environment variable validation | Add startup check |

---

## Recommended Fix Order

### Immediate (P0)
1. Fix API key auth user attribution
2. Fix Rules save to preserve rules
3. Fix confirm/reject match status filter
4. Fix entity status after conflict resolution
5. Make demo load async

### Short-term (P1)
6. Add job progress polling
7. Fix UUID display in Datasets/Schedules
8. Fix ConflictDetail coloring
9. Standardize auth pages to use `api.ts`
10. Add CSRF protection

### Medium-term (P2)
11. Add pagination controls
12. Add file download/delete UI
13. Add merge entities endpoint
14. Add bulk actions
15. Add notification center UI

### Long-term (P3)
16. Add Data Quality Center
17. Add Source Health
18. Add Reports
19. Add API Playground
20. Code splitting for frontend
