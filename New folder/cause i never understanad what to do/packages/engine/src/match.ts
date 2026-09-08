import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS } from "@reconcile/shared";
import { addressSimilarity, nameSimilarity } from "./similarity";
import type { NormalizedFields } from "./normalize";

export type MatchRecord = {
  id: string;
  sourceId: string;
  fields: NormalizedFields;
};

export type MatchPair = {
  a: string;
  b: string;
  score: number;
  reasons: string[];
  matchedFields: string[];
  fieldScores: Record<string, number>;
};

export type Cluster = {
  recordIds: string[];
  score: number;
  reasons: string[];
  matchedFields: string[];
};

export function compareRecords(
  a: MatchRecord,
  b: MatchRecord,
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): MatchPair {
  const fieldScores: Record<string, number> = {};
  const reasons: string[] = [];
  const matchedFields: string[] = [];
  let weighted = 0;
  let weightSum = 0;

  const add = (field: string, score: number, reason?: string) => {
    const w = weights[field] ?? 0;
    if (w <= 0) return;
    fieldScores[field] = score;
    weighted += w * score;
    weightSum += w;
    if (score >= 0.92) {
      matchedFields.push(field);
      if (reason) reasons.push(reason);
    } else if (score >= 0.75 && reason) {
      matchedFields.push(field);
      reasons.push(reason);
    }
  };

  const ea = a.fields.email;
  const eb = b.fields.email;
  if (ea && eb) {
    const exact = ea === eb;
    add("email", exact ? 1 : 0, exact ? "Exact email match" : undefined);
  }

  const pa = a.fields.phone;
  const pb = b.fields.phone;
  if (pa && pb) {
    const exact = pa === pb || pa.slice(-10) === pb.slice(-10);
    add("phone", exact ? 1 : 0, exact ? "Exact phone match" : undefined);
  }

  const na = a.fields.name;
  const nb = b.fields.name;
  if (na && nb) {
    const s = nameSimilarity(na, nb);
    add("name", s, s >= 0.9 ? "High name similarity" : s >= 0.75 ? "Moderate name similarity" : undefined);
  }

  const aa = a.fields.address || a.fields.city;
  const ab = b.fields.address || b.fields.city;
  if (aa && ab) {
    const s = addressSimilarity(aa, ab);
    add("address", s, s >= 0.9 ? "High address similarity" : s >= 0.75 ? "Moderate address similarity" : undefined);
  }

  if (a.fields.date_of_birth && b.fields.date_of_birth) {
    const exact = a.fields.date_of_birth === b.fields.date_of_birth;
    add("date_of_birth", exact ? 1 : 0, exact ? "Date of birth match" : undefined);
  }

  if (a.fields.customer_id && b.fields.customer_id) {
    const exact = a.fields.customer_id === b.fields.customer_id;
    add("customer_id", exact ? 1 : 0, exact ? "Customer ID match" : undefined);
  }

  if (a.fields.company && b.fields.company) {
    const s = nameSimilarity(a.fields.company, b.fields.company);
    add("company", s, s >= 0.9 ? "Company match" : undefined);
  }

  const score = weightSum > 0 ? weighted / weightSum : 0;
  return { a: a.id, b: b.id, score, reasons, matchedFields: [...new Set(matchedFields)], fieldScores };
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function blockingKey(r: MatchRecord): string[] {
  const keys: string[] = [];
  if (r.fields.email) keys.push(`e:${r.fields.email}`);
  if (r.fields.phone) keys.push(`p:${r.fields.phone.slice(-10)}`);
  if (r.fields.customer_id) keys.push(`c:${r.fields.customer_id}`);
  if (r.fields.name) {
    const first = r.fields.name.split(" ")[0];
    if (first && first.length >= 3) keys.push(`n:${first}`);
  }
  return keys;
}

export function clusterRecords(
  records: MatchRecord[],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
  thresholds: { autoMatch: number; reviewMatch: number } = DEFAULT_THRESHOLDS,
): { clusters: Cluster[]; pairs: MatchPair[] } {
  const uf = new UnionFind();
  const pairMap = new Map<string, MatchPair>();
  const buckets = new Map<string, MatchRecord[]>();

  for (const r of records) {
    uf.find(r.id);
    for (const k of blockingKey(r)) {
      const list = buckets.get(k) ?? [];
      list.push(r);
      buckets.set(k, list);
    }
  }

  const considered = new Set<string>();
  for (const list of buckets.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.id === b.id) continue;
        const pk = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (considered.has(pk)) continue;
        considered.add(pk);
        const pair = compareRecords(a, b, weights);
        if (pair.score >= thresholds.reviewMatch) {
          pairMap.set(pk, pair);
          uf.union(a.id, b.id);
        }
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const r of records) {
    const root = uf.find(r.id);
    const g = groups.get(root) ?? [];
    g.push(r.id);
    groups.set(root, g);
  }

  const clusters: Cluster[] = [];
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const related = [...pairMap.values()].filter((p) => ids.includes(p.a) && ids.includes(p.b));
    const score = related.length ? Math.max(...related.map((p) => p.score)) : 0;
    const reasons = [...new Set(related.flatMap((p) => p.reasons))];
    const matchedFields = [...new Set(related.flatMap((p) => p.matchedFields))];
    clusters.push({ recordIds: ids, score, reasons, matchedFields });
  }

  return { clusters, pairs: [...pairMap.values()] };
}
