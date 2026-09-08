import type { Severity } from "@reconcile/shared";
import { DEFAULT_FIELD_IMPORTANCE } from "@reconcile/shared";

export type FieldOccurrence = {
  sourceRecordId: string;
  sourceId: string;
  sourceName: string;
  reliability: number;
  rawValue: string;
  normalizedValue: string;
  updatedAt: Date | null;
};

export type FieldConflict = {
  field: string;
  occurrences: FieldOccurrence[];
  distinctNormalized: string[];
  isConflict: boolean;
};

export function detectFieldConflict(field: string, occurrences: FieldOccurrence[]): FieldConflict {
  const present = occurrences.filter((o) => o.normalizedValue);
  const distinctNormalized = [...new Set(present.map((o) => o.normalizedValue))];
  return {
    field,
    occurrences: present,
    distinctNormalized,
    isConflict: distinctNormalized.length > 1,
  };
}

export function conflictSeverity(opts: {
  field: string;
  distinctCount: number;
  sourceCount: number;
  minReliability: number;
  maxReliability: number;
  importance?: Record<string, Severity>;
}): Severity {
  const importance = opts.importance ?? DEFAULT_FIELD_IMPORTANCE;
  const base = importance[opts.field] ?? "medium";
  let rank = { low: 0, medium: 1, high: 2, critical: 3 }[base];
  if (opts.distinctCount >= 3) rank += 1;
  if (opts.sourceCount >= 3 && opts.distinctCount >= 2) rank += 1;
  if (opts.maxReliability - opts.minReliability >= 40 && opts.distinctCount >= 2) rank += 1;
  if (opts.field === "name" && opts.distinctCount === 2) rank = Math.max(0, rank - 1);
  rank = Math.min(3, rank);
  return (["low", "medium", "high", "critical"] as const)[rank]!;
}
