# ReconcileAI — Reconciliation Algorithm

## Normalization

All raw source values are preserved. Normalized forms are stored separately.

| Field | Normalization |
|-------|--------------|
| name | Lowercase, trim, collapse whitespace, strip diacritics |
| email | Lowercase, trim |
| phone | Strip non-digits, default country code, validate length 10–15 |
| address/city/country | Lowercase, expand abbreviations (st→street, ave→avenue) |
| date_of_birth | ISO `YYYY-MM-DD` |
| salary | Numeric parse |
| status/payment_status | Map to `active`/`inactive`/`paid`/`unpaid` |
| company | Same as name |
| customer_id | Lowercase trim |

## Entity Matching

1. **Blocking**: Use email, phone (last 10 digits), customer_id, first name ≥3 chars.
2. **Pairwise comparison** within blocks:
   - Email exact match: 1.0
   - Phone exact/last10 match: 1.0
   - Name: max(Jaro–Winkler, token set ratio, compact Jaro–Winkler)
   - Address/city: max(Jaro–Winkler, token set ratio)
   - DOB exact: 1.0
   - Customer ID exact: 1.0
   - Company: Jaro–Winkler
3. **Weighted sum** using org configurable weights (default: name 0.35, email 0.30, phone 0.20, address 0.15, dob 0.10, customer_id 0.25, company 0.10).
4. **Union-find** clusters records with score ≥ `reviewMatch` threshold (default 0.70).
5. Singles become `singleton` entities.

## Conflict Detection

For each entity, per field:
- Collect all present normalized values.
- If >1 distinct value → conflict.
- Missing values are ignored.

## Confidence Scoring

For each candidate normalized value:

```
score = 0.30 * agreement
      + 0.25 * authority
      + 0.20 * reliability
      + 0.15 * recency
      + 0.10 * completeness
      + 0.05 * (feedbackBoost - 0.5) * 2
```

- **Agreement**: fraction of sources with this value.
- **Authority**: max `authorityScore` among sources for this field, or priority-rank fallback.
- **Reliability**: max source reliability / 100.
- **Recency**: half-life 90 days (`0.5 ^ (days / 90)`).
- **Completeness**: 1.0 (placeholder for future extensions).
- **Feedback**: logistic regression output if model trained, else 0.5.

## Severity

Base importance from `fieldImportance` config.
- +1 if ≥3 distinct values
- +1 if ≥3 sources and ≥2 distinct values
- +1 if reliability spread ≥40 and ≥2 distinct values
- -1 if name field and exactly 2 distinct values
Clamped to `low/medium/high/critical`.

## Resolution Path

- `confidence >= autoResolve` (default 0.90) → auto-resolve + audit.
- `confidence >= mediumConfidence` (default 0.70) → optional review.
- `< mediumConfidence` → mandatory human review.

## Recommendation Selection

Among candidate values with highest score:
1. Prefer source with highest field authority.
2. Break ties by most recent `sourceUpdatedAt`.
3. Generate deterministic explanation bullets.

## Phase 4 — Feedback Model

- Every human decision logs `model_feedback`.
- After ≥20 labeled rows, train logistic regression.
- Model version stored in `model_versions`.
- UI shows `modelVersion` or "deterministic (untrained)".
