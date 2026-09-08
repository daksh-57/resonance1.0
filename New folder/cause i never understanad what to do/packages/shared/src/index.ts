export const CANONICAL_FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "status",
  "date_of_birth",
  "company",
  "payment_status",
  "customer_id",
  "salary",
  "city",
  "country",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const SOURCE_TYPES = ["crm", "erp", "billing", "hr", "other", "api"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const JOB_STATUSES = ["queued", "processing", "completed", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFLICT_STATUSES = [
  "open",
  "auto_resolved",
  "pending_review",
  "approved",
  "rejected",
  "overridden",
] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

export const MATCH_STATUSES = ["proposed", "confirmed", "rejected", "split"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const DEFAULT_WEIGHTS: Record<string, number> = {
  name: 0.35,
  email: 0.3,
  phone: 0.2,
  address: 0.15,
  date_of_birth: 0.1,
  customer_id: 0.25,
  company: 0.1,
};

export const DEFAULT_THRESHOLDS = {
  autoMatch: 0.9,
  reviewMatch: 0.7,
  autoResolve: 0.9,
  mediumConfidence: 0.7,
};

export const DEFAULT_FIELD_IMPORTANCE: Record<string, Severity> = {
  name: "low",
  email: "high",
  phone: "high",
  address: "medium",
  status: "medium",
  date_of_birth: "high",
  company: "low",
  payment_status: "high",
  customer_id: "medium",
  salary: "critical",
  city: "low",
  country: "low",
};

export const HEADER_ALIASES: Record<string, CanonicalField> = {
  customer_name: "name",
  full_name: "name",
  fullname: "name",
  contact_name: "name",
  employee_name: "name",
  name: "name",
  email_address: "email",
  email: "email",
  mail: "email",
  mobile_number: "phone",
  mobile: "phone",
  phone_number: "phone",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  location: "address",
  addr: "address",
  address: "address",
  street: "address",
  city: "city",
  country: "country",
  status: "status",
  payment_status: "payment_status",
  pay_status: "payment_status",
  dob: "date_of_birth",
  date_of_birth: "date_of_birth",
  birthdate: "date_of_birth",
  company: "company",
  organization: "company",
  org: "company",
  customer_id: "customer_id",
  cust_id: "customer_id",
  account_id: "customer_id",
  salary: "salary",
  id: "customer_id",
};

export function autoMapHeader(header: string): CanonicalField | null {
  const key = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return HEADER_ALIASES[key] ?? (CANONICAL_FIELDS.includes(key as CanonicalField) ? (key as CanonicalField) : null);
}

export function confidenceBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

export type OrgSettings = {
  weights: Record<string, number>;
  thresholds: typeof DEFAULT_THRESHOLDS;
  fieldImportance: Record<string, Severity>;
};

export function defaultOrgSettings(): OrgSettings {
  return {
    weights: { ...DEFAULT_WEIGHTS },
    thresholds: { ...DEFAULT_THRESHOLDS },
    fieldImportance: { ...DEFAULT_FIELD_IMPORTANCE },
  };
}

export const AUDIT_ACTIONS = [
  "USER_REGISTERED",
  "SOURCE_CREATED",
  "SOURCE_UPDATED",
  "FILE_UPLOADED",
  "DATA_IMPORTED",
  "RECORD_NORMALIZED",
  "ENTITY_MATCHED",
  "DUPLICATE_CONFIRMED",
  "DUPLICATE_REJECTED",
  "ENTITY_MERGED",
  "ENTITY_SPLIT",
  "CONFLICT_DETECTED",
  "CONFLICT_AUTO_RESOLVED",
  "REVIEW_STARTED",
  "DECISION_APPROVED",
  "DECISION_REJECTED",
  "DECISION_OVERRIDDEN",
  "CANONICAL_RECORD_CREATED",
  "CANONICAL_RECORD_UPDATED",
  "SOURCE_RULE_CHANGED",
  "SETTINGS_CHANGED",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "SCHEDULE_CREATED",
  "SCHEDULE_UPDATED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
