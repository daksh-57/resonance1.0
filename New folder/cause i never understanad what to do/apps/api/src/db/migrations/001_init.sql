CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_org_idx ON users(organization_id);

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reliability INTEGER NOT NULL DEFAULT 70 CHECK (reliability BETWEEN 0 AND 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sources_org_idx ON sources(organization_id);

CREATE TABLE source_field_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  authority_score INTEGER NOT NULL DEFAULT 70 CHECK (authority_score BETWEEN 0 AND 100),
  priority_rank INTEGER NOT NULL DEFAULT 100,
  UNIQUE (source_id, field_name)
);

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  valid_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX datasets_org_idx ON datasets(organization_id);

CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  mime TEXT,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT,
  row_number INTEGER,
  raw JSONB NOT NULL,
  source_updated_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT
);
CREATE INDEX source_records_org_idx ON source_records(organization_id);
CREATE INDEX source_records_source_idx ON source_records(source_id);

CREATE TABLE normalized_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL UNIQUE REFERENCES source_records(id) ON DELETE CASCADE,
  fields JSONB NOT NULL,
  search_name TEXT,
  search_email TEXT,
  search_phone TEXT
);
CREATE INDEX normalized_email_idx ON normalized_records(organization_id, search_email);
CREATE INDEX normalized_phone_idx ON normalized_records(organization_id, search_phone);
CREATE INDEX normalized_name_idx ON normalized_records(organization_id, search_name);

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  confidence DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entities_org_idx ON entities(organization_id);
CREATE INDEX entities_email_idx ON entities(organization_id, primary_email);
CREATE INDEX entities_phone_idx ON entities(organization_id, primary_phone);
CREATE INDEX entities_name_idx ON entities(organization_id, display_name);

CREATE TABLE entity_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  match_score DOUBLE PRECISION,
  match_reason TEXT,
  matched_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'proposed',
  UNIQUE (entity_id, source_record_id)
);
CREATE INDEX entity_matches_org_idx ON entity_matches(organization_id);
CREATE INDEX entity_matches_record_idx ON entity_matches(source_record_id);

CREATE TABLE field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  raw_value TEXT,
  normalized_value TEXT,
  source_updated_at TIMESTAMPTZ
);
CREATE INDEX field_values_entity_idx ON field_values(entity_id, field_name);

CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  recommended_value TEXT,
  recommended_raw TEXT,
  recommended_source_id UUID REFERENCES sources(id),
  confidence DOUBLE PRECISION,
  explanation TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conflicts_org_idx ON conflicts(organization_id);
CREATE INDEX conflicts_status_idx ON conflicts(organization_id, status);
CREATE INDEX conflicts_entity_idx ON conflicts(entity_id);

CREATE TABLE review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conflict_id UUID NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX review_tasks_org_idx ON review_tasks(organization_id, status);

CREATE TABLE reconciliation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conflict_id UUID REFERENCES conflicts(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  chosen_value TEXT,
  previous_value TEXT,
  reason TEXT,
  method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE canonical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  confidence DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX canonical_org_idx ON canonical_records(organization_id);

CREATE TABLE canonical_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  canonical_record_id UUID NOT NULL REFERENCES canonical_records(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value TEXT,
  raw_value TEXT,
  source_id UUID REFERENCES sources(id),
  confidence DOUBLE PRECISION,
  decision_id UUID REFERENCES reconciliation_decisions(id),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (canonical_record_id, field_name)
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  source_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_org_idx ON audit_events(organization_id, created_at DESC);
CREATE INDEX audit_action_idx ON audit_events(organization_id, action);

CREATE TABLE reconciliation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jobs_org_idx ON reconciliation_jobs(organization_id, created_at DESC);
CREATE INDEX jobs_status_idx ON reconciliation_jobs(status) WHERE status IN ('queued', 'processing');

CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES reconciliation_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX job_logs_job_idx ON job_logs(job_id, created_at);

CREATE TABLE model_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conflict_id UUID,
  entity_id UUID,
  features JSONB NOT NULL,
  predicted_value TEXT,
  predicted_confidence DOUBLE PRECISION,
  human_value TEXT,
  accepted BOOLEAN,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  weights JSONB NOT NULL,
  bias DOUBLE PRECISION NOT NULL DEFAULT 0,
  training_records INTEGER NOT NULL,
  accuracy DOUBLE PRECISION,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  interval TEXT NOT NULL,
  endpoint TEXT,
  auth_config_enc TEXT,
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications(user_id, created_at DESC);
