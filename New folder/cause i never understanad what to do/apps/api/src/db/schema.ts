import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  reliability: integer("reliability").notNull().default(70),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sourceFieldRules = pgTable(
  "source_field_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    authorityScore: integer("authority_score").notNull().default(70),
    priorityRank: integer("priority_rank").notNull().default(100),
  },
  (t) => [unique().on(t.sourceId, t.fieldName)],
);

export const datasets = pgTable("datasets", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  mapping: jsonb("mapping").notNull().default({}),
  rowCount: integer("row_count").notNull().default(0),
  validCount: integer("valid_count").notNull().default(0),
  invalidCount: integer("invalid_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  conflictCount: integer("conflict_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  datasetId: uuid("dataset_id").references(() => datasets.id, { onDelete: "set null" }),
  originalName: text("original_name").notNull(),
  mime: text("mime"),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sourceRecords = pgTable("source_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  datasetId: uuid("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  rowNumber: integer("row_number"),
  raw: jsonb("raw").notNull(),
  sourceUpdatedAt: ts("source_updated_at"),
  ingestedAt: ts("ingested_at").notNull().defaultNow(),
  error: text("error"),
});

export const normalizedRecords = pgTable("normalized_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceRecordId: uuid("source_record_id")
    .notNull()
    .unique()
    .references(() => sourceRecords.id, { onDelete: "cascade" }),
  fields: jsonb("fields").notNull(),
  searchName: text("search_name"),
  searchEmail: text("search_email"),
  searchPhone: text("search_phone"),
});

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  status: text("status").notNull().default("open"),
  confidence: doublePrecision("confidence"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const entityMatches = pgTable(
  "entity_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    sourceRecordId: uuid("source_record_id").notNull().references(() => sourceRecords.id, { onDelete: "cascade" }),
    matchScore: doublePrecision("match_score"),
    matchReason: text("match_reason"),
    matchedFields: jsonb("matched_fields").notNull().default([]),
    confidence: doublePrecision("confidence"),
    status: text("status").notNull().default("proposed"),
  },
  (t) => [unique().on(t.entityId, t.sourceRecordId)],
);

export const fieldValues = pgTable("field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  sourceRecordId: uuid("source_record_id").notNull().references(() => sourceRecords.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  rawValue: text("raw_value"),
  normalizedValue: text("normalized_value"),
  sourceUpdatedAt: ts("source_updated_at"),
});

export const conflicts = pgTable("conflicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  recommendedValue: text("recommended_value"),
  recommendedRaw: text("recommended_raw"),
  recommendedSourceId: uuid("recommended_source_id").references(() => sources.id),
  confidence: doublePrecision("confidence"),
  explanation: text("explanation"),
  reasons: jsonb("reasons").notNull().default([]),
  candidates: jsonb("candidates").notNull().default([]),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const reviewTasks = pgTable("review_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  conflictId: uuid("conflict_id").notNull().references(() => conflicts.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const reconciliationDecisions = pgTable("reconciliation_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  conflictId: uuid("conflict_id").references(() => conflicts.id, { onDelete: "set null" }),
  entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  chosenValue: text("chosen_value"),
  previousValue: text("previous_value"),
  reason: text("reason"),
  method: text("method").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const canonicalRecords = pgTable("canonical_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull().unique().references(() => entities.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  confidence: doublePrecision("confidence"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const canonicalFieldValues = pgTable(
  "canonical_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    canonicalRecordId: uuid("canonical_record_id").notNull().references(() => canonicalRecords.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    value: text("value"),
    rawValue: text("raw_value"),
    sourceId: uuid("source_id").references(() => sources.id),
    confidence: doublePrecision("confidence"),
    decisionId: uuid("decision_id").references(() => reconciliationDecisions.id),
    evidence: jsonb("evidence").notNull().default({}),
  },
  (t) => [unique().on(t.canonicalRecordId, t.fieldName)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    reason: text("reason"),
    sourceId: uuid("source_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_org_idx").on(t.organizationId, t.createdAt)],
);

export const reconciliationJobs = pgTable("reconciliation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  datasetId: uuid("dataset_id").references(() => datasets.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  total: integer("total").notNull().default(0),
  processed: integer("processed").notNull().default(0),
  error: text("error"),
  payload: jsonb("payload").notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const jobLogs = pgTable("job_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => reconciliationJobs.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const modelFeedback = pgTable("model_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  conflictId: uuid("conflict_id"),
  entityId: uuid("entity_id"),
  features: jsonb("features").notNull(),
  predictedValue: text("predicted_value"),
  predictedConfidence: doublePrecision("predicted_confidence"),
  humanValue: text("human_value"),
  accepted: boolean("accepted"),
  modelVersion: text("model_version"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const modelVersions = pgTable("model_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  weights: jsonb("weights").notNull(),
  bias: doublePrecision("bias").notNull().default(0),
  trainingRecords: integer("training_records").notNull(),
  accuracy: doublePrecision("accuracy"),
  trainedAt: ts("trained_at").notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  lastUsedAt: ts("last_used_at"),
  revokedAt: ts("revoked_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const scheduledImports = pgTable("scheduled_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  interval: text("interval").notNull(),
  endpoint: text("endpoint"),
  authConfigEnc: text("auth_config_enc"),
  mapping: jsonb("mapping").notNull().default({}),
  active: boolean("active").notNull().default(true),
  lastRunAt: ts("last_run_at"),
  lastStatus: text("last_status"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});
