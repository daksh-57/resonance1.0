import { DEFAULT_THRESHOLDS } from "@reconcile/shared";
import type { FieldOccurrence } from "./conflicts";

export type AuthorityRule = {
  sourceId: string;
  fieldName: string;
  authorityScore: number;
  priorityRank: number;
};

export type Recommendation = {
  value: string;
  rawValue: string;
  sourceId: string;
  sourceName: string;
  sourceRecordId: string;
  confidence: number;
  explanation: string;
  reasons: string[];
  scores: {
    agreement: number;
    authority: number;
    reliability: number;
    recency: number;
    completeness: number;
    feedback?: number;
  };
};

const HALF_LIFE_DAYS = 90;

function recencyScore(updatedAt: Date | null, now: Date): number {
  if (!updatedAt) return 0.4;
  const days = Math.max(0, (now.getTime() - updatedAt.getTime()) / 86_400_000);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

function daysAgo(updatedAt: Date | null, now: Date): number | null {
  if (!updatedAt) return null;
  return Math.round((now.getTime() - updatedAt.getTime()) / 86_400_000);
}

export function recommendValue(
  field: string,
  occurrences: FieldOccurrence[],
  rules: AuthorityRule[],
  now = new Date(),
  feedbackBoost?: Record<string, number>,
): Recommendation | null {
  const present = occurrences.filter((o) => o.normalizedValue);
  if (!present.length) return null;

  const groups = new Map<string, FieldOccurrence[]>();
  for (const o of present) {
    const g = groups.get(o.normalizedValue) ?? [];
    g.push(o);
    groups.set(o.normalizedValue, g);
  }

  const total = present.length;
  let best: Recommendation | null = null;

  for (const [norm, group] of groups) {
    const agreement = group.length / total;
    const reliability = Math.max(...group.map((g) => g.reliability)) / 100;
    const recency = Math.max(...group.map((g) => recencyScore(g.updatedAt, now)));
    const completeness = 1;
    const authority = Math.max(
      ...group.map((g) => {
        const rule = rules.find((r) => r.sourceId === g.sourceId && r.fieldName === field);
        if (rule) return rule.authorityScore / 100;
        const ranked = rules.filter((r) => r.fieldName === field).sort((a, b) => a.priorityRank - b.priorityRank);
        const idx = ranked.findIndex((r) => r.sourceId === g.sourceId);
        if (idx >= 0) return Math.max(0.3, 1 - idx * 0.15);
        return reliability;
      }),
    );
    const fb = feedbackBoost?.[norm] ?? 0.5;
    const score =
      0.3 * agreement + 0.25 * authority + 0.2 * reliability + 0.15 * recency + 0.1 * completeness + 0.05 * (fb - 0.5) * 2;

    const pick = [...group].sort((a, b) => {
      const ra = (rules.find((r) => r.sourceId === a.sourceId && r.fieldName === field)?.authorityScore ?? a.reliability) as number;
      const rb = (rules.find((r) => r.sourceId === b.sourceId && r.fieldName === field)?.authorityScore ?? b.reliability) as number;
      if (rb !== ra) return rb - ra;
      return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
    })[0]!;

    const reasons: string[] = [];
    if (agreement >= 0.66 && group.length >= 2) {
      reasons.push(
        `${group.map((g) => g.sourceName).join(" and ")} agree on this ${field.replace("_", " ")}.`,
      );
    }
    const topRule = rules
      .filter((r) => r.fieldName === field)
      .sort((a, b) => a.priorityRank - b.priorityRank || b.authorityScore - a.authorityScore)[0];
    if (topRule && topRule.sourceId === pick.sourceId) {
      reasons.push(`${pick.sourceName} has the highest configured authority for ${field.replace("_", " ")}.`);
    } else {
      reasons.push(`${pick.sourceName} reliability is ${pick.reliability}/100.`);
    }
    const d = daysAgo(pick.updatedAt, now);
    if (d !== null) {
      reasons.push(`${pick.sourceName} value was updated ${d === 0 ? "today" : `${d} day(s) ago`}.`);
    }
    const losers = present.filter((o) => o.normalizedValue !== norm);
    for (const l of losers) {
      const ld = daysAgo(l.updatedAt, now);
      if (ld !== null && ld > 180) {
        reasons.push(`The ${l.sourceName} value is significantly older (${ld} days).`);
        break;
      }
    }
    if (!reasons.length) reasons.push("Selected using source reliability, recency, and agreement.");

    const rec: Recommendation = {
      value: norm,
      rawValue: pick.rawValue,
      sourceId: pick.sourceId,
      sourceName: pick.sourceName,
      sourceRecordId: pick.sourceRecordId,
      confidence: Math.max(0.05, Math.min(0.99, score)),
      explanation: reasons.join(" "),
      reasons,
      scores: { agreement, authority, reliability, recency, completeness, feedback: fb },
    };

    if (!best || rec.confidence > best.confidence) best = rec;
  }

  return best;
}

export function resolutionPath(
  confidence: number,
  thresholds = DEFAULT_THRESHOLDS,
): "auto" | "optional_review" | "mandatory_review" {
  if (confidence >= thresholds.autoResolve) return "auto";
  if (confidence >= thresholds.mediumConfidence) return "optional_review";
  return "mandatory_review";
}
