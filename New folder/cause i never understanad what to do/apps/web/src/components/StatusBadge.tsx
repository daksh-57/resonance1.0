import { CANONICAL_FIELDS, CONFLICT_STATUSES, JOB_STATUSES, MATCH_STATUSES, SEVERITIES, type ConflictStatus, type JobStatus, type MatchStatus, type Severity } from "@reconcile/shared";

const SEV_COLORS: Record<Severity, string> = { low: "bg-slate-100 text-slate-700", medium: "bg-amber-50 text-amber-700", high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700" };
const STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-50 text-amber-700",
  auto_resolved: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  overridden: "bg-blue-50 text-blue-700",
  draft: "bg-slate-100 text-slate-700",
  reconciled: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  proposed: "bg-amber-50 text-amber-700",
  split: "bg-blue-50 text-blue-700",
  singleton: "bg-slate-100 text-slate-700",
  queued: "bg-slate-100 text-slate-700",
  processing: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-700",
};

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className={`badge ${color || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={STATUS_COLORS[status] || "bg-slate-100 text-slate-700"}>{status.replace(/_/g, " ")}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge color={SEV_COLORS[severity as Severity] || "bg-slate-100 text-slate-700"}>{severity}</Badge>;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? "bg-emerald-50 text-emerald-700" : pct >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <Badge color={color}>{pct}%</Badge>;
}
