# ReconcileAI — REST API

Base URL: `/api`

Auth: Session cookie (`sid`) or `Authorization: Bearer rai_...`

## Auth
- `POST /auth/register` — `{name, email, password, confirmPassword, organizationName?}`
- `POST /auth/login` — `{email, password}`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password` — `{email}`
- `POST /auth/reset-password` — `{token, password}`

## Dashboard
- `GET /dashboard`

## Sources
- `GET /sources`
- `POST /sources` — `{name, type, description?, reliability?}`
- `PATCH /sources/:id` — `{name?, description?, reliability?, active?}`

## Rules
- `GET /rules` — `{sources, rules, settings, fields}`
- `PUT /rules` — `{rules: [{sourceId, fieldName, authorityScore, priorityRank}], settings?}`

## Datasets
- `GET /datasets`
- `GET /datasets/:id` — `{dataset, files, jobs}`

## Upload
- `POST /upload` (multipart `file` + `sourceId`) — `{datasetId, headers, mapping, preview, errors, rowCount, fields}`

## Mapping
- `POST /datasets/:id/mapping` — `{mapping: Record<string,string>}`

## Import
- `POST /datasets/:id/import` — `{job}`
- `GET /jobs/:id` — `{job, logs}`

## Entities
- `GET /entities?page&pageSize&q&status`
- `GET /entities/:id` — `{entity, matches, sourceRecords, conflicts, canonical, canonicalFields, audit, sources}`
- `POST /entities/:id/confirm-match`
- `POST /entities/:id/reject-match`
- `POST /entities/:id/split` — `{sourceRecordIds: string[]}`

## Duplicates
- `GET /duplicates`

## Conflicts
- `GET /conflicts?page&pageSize&status&severity&field`
- `GET /conflicts/:id` — `{conflict, entity, sources, sourceRecords}`
- `POST /conflicts/:id/resolve` — `{action: "approve"|"reject"|"choose"|"edit", value?, reason?}`

## Review
- `GET /review` — `{tasks}`

## Canonical Records
- `GET /canonical-records`
- `GET /canonical-records/:id`

## Audit
- `GET /audit?action`

## Search
- `GET /search?q=`

## Notifications
- `GET /notifications`
- `POST /notifications/:id/read`

## Settings
- `GET /settings` — `{organization, profile}`
- `PATCH /settings` — `{organizationName?, name?}`

## API Keys
- `GET /api-keys` — `{keys}`
- `POST /api-keys` — `{name}` → `{key, id, prefix}` (key shown once)
- `POST /api-keys/:id/revoke`
- `POST /api-keys/:id/rotate` → `{key, prefix}`

## Schedules
- `GET /schedules`
- `POST /schedules` — `{name, sourceId, interval, endpoint?, token?, mapping?}`

## Export
- `GET /export/:kind.csv` (`canonical`, `conflicts`, `duplicates`, `audit`, `decisions`)

## Docs
- `GET /docs`

## ML
- `GET /ml` — `{trained, versions, feedbackRows, note}`

## Demo
- `POST /demo/load` — `{ok, sources}`
