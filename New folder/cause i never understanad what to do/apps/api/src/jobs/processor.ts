import { CANONICAL_FIELDS, defaultOrgSettings, type OrgSettings } from "@reconcile/shared";
import {
  clusterRecords,
  conflictSeverity,
  detectFieldConflict,
  normalizeMappedRow,
  recommendValue,
  resolutionPath,
  type FieldOccurrence,
  type NormalizedFields,
} from "@reconcile/engine";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import {
  canonicalFieldValues,
  canonicalRecords,
  conflicts,
  datasets,
  entities,
  entityMatches,
  fieldValues,
  jobLogs,
  normalizedRecords,
  organizations,
  reconciliationDecisions,
  reconciliationJobs,
  reviewTasks,
  sourceFieldRules,
  sourceRecords,
  sources,
  uploadedFiles,
} from "../db/schema.ts";
import { audit, notify } from "../lib/audit.ts";
import { maybePolishExplanation } from "../lib/llm.ts";
import { parseUpload } from "../lib/parse.ts";
import { readFile } from "node:fs/promises";
import { env } from "../config.ts";

async function log(jobId: string, message: string, level = "info") {
  await db.insert(jobLogs).values({ jobId, message, level });
}

export async function enqueueJob(input: {
  organizationId: string;
  datasetId?: string;
  type: string;
  payload?: Record<string, unknown>;
}) {
  const [job] = await db
    .insert(reconciliationJobs)
    .values({
      organizationId: input.organizationId,
      datasetId: input.datasetId,
      type: input.type,
      payload: input.payload ?? {},
      status: "queued",
    })
    .returning();
  return job!;
}

export async function processNextJob(): Promise<boolean> {
  const queued = await db
    .select()
    .from(reconciliationJobs)
    .where(eq(reconciliationJobs.status, "queued"))
    .limit(1);
  const job = queued[0];
  if (!job) return false;
  await db
    .update(reconciliationJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(reconciliationJobs.id, job.id));
  try {
    if (job.type === "import_and_reconcile") {
      await runImportAndReconcile(job.id, job.organizationId, job.datasetId!);
    } else if (job.type === "reconcile_org") {
      await rebuildOrg(job.organizationId, job.id);
    } else {
      await log(job.id, `Unknown job type ${job.type}`, "warn");
    }
    await db
      .update(reconciliationJobs)
      .set({ status: "completed", progress: 100, updatedAt: new Date() })
      .where(eq(reconciliationJobs.id, job.id));
  } catch (e) {
    const msg = (e as Error).message;
    await log(job.id, msg, "error");
    await db
      .update(reconciliationJobs)
      .set({ status: "failed", error: msg, updatedAt: new Date() })
      .where(eq(reconciliationJobs.id, job.id));
    await notify({
      organizationId: job.organizationId,
      type: "import_failed",
      title: "Import failed",
      body: msg,
    });
  }
  return true;
}

async function tick(jobId: string, processed: number, total: number) {
  const progress = total ? Math.min(99, Math.round((processed / total) * 100)) : 0;
  await db
    .update(reconciliationJobs)
    .set({ processed, total, progress, updatedAt: new Date() })
    .where(eq(reconciliationJobs.id, jobId));
}

export async function runImportAndReconcile(jobId: string, orgId: string, datasetId: string) {
  await log(jobId, "Starting import");
  const [dataset] = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.id, datasetId), eq(datasets.organizationId, orgId)))
    .limit(1);
  if (!dataset) throw new Error("Dataset not found");
  const file = (
    await db
      .select()
      .from(uploadedFiles)
      .where(and(eq(uploadedFiles.datasetId, datasetId), eq(uploadedFiles.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!file) throw new Error("Uploaded file missing");
  const buf = await readFile(file.storagePath);
  const parsed = parseUpload(file.originalName, buf);
  const mapping = (dataset.mapping ?? {}) as Record<string, string>;
  const total = parsed.rows.length;
  await tick(jobId, 0, total);
  await db.update(datasets).set({ status: "processing", rowCount: total, updatedAt: new Date() }).where(eq(datasets.id, datasetId));

  let valid = 0;
  let invalid = 0;
  const batch: (typeof sourceRecords.$inferInsert)[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i]!;
    const mapped: Record<string, unknown> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field) mapped[field] = row[col];
    }
    const updatedRaw = row.updated_at ?? row.last_updated ?? row.modified ?? row.as_of;
    let sourceUpdatedAt: Date | null = null;
    if (updatedRaw) {
      const d = new Date(String(updatedRaw));
      if (!Number.isNaN(d.getTime())) sourceUpdatedAt = d;
    }
    const { raw, normalized } = normalizeMappedRow(mapped, env.defaultCountryCode);
    const rowErrors: string[] = [];
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) rowErrors.push("Invalid email");
    if (raw.phone && (normalized.phone?.length ?? 0) < 10) rowErrors.push("Invalid phone");

    batch.push({
      organizationId: orgId,
      datasetId,
      sourceId: dataset.sourceId,
      externalId: String(raw.customer_id || row.id || i + 1),
      rowNumber: i + 1,
      raw: { original: row, mapped: raw, normalized },
      sourceUpdatedAt,
      error: rowErrors.length ? rowErrors.join("; ") : null,
    });

    if (batch.length >= 200 || i === parsed.rows.length - 1) {
      const inserted = await db.insert(sourceRecords).values(batch).returning();
      const norms = inserted.map((rec, idx) => {
        const orig = batch[idx]!;
        const mappedRaw = (orig.raw as { mapped: Record<string, string> }).mapped;
        const storedNorm = (orig.raw as { normalized: Record<string, string> }).normalized;
        const fields = storedNorm;
        if (orig.error) invalid++;
        else valid++;
        return {
          organizationId: orgId,
          sourceRecordId: rec.id,
          fields,
          searchName: fields.name ?? null,
          searchEmail: fields.email ?? null,
          searchPhone: fields.phone ?? null,
        };
      });
      if (norms.length) await db.insert(normalizedRecords).values(norms);
      batch.length = 0;
      await tick(jobId, i + 1, total);
    }
  }

  await db
    .update(datasets)
    .set({ validCount: valid, invalidCount: invalid, updatedAt: new Date() })
    .where(eq(datasets.id, datasetId));
  await log(jobId, `Imported ${valid} valid / ${invalid} invalid rows`);
  await audit({
    organizationId: orgId,
    action: "DATA_IMPORTED",
    entityType: "dataset",
    entityId: datasetId,
    metadata: { valid, invalid, total },
  });

  await rebuildOrg(orgId, jobId);

  const dupes = await db.select().from(entities).where(eq(entities.organizationId, orgId));
  const conf = await db.select().from(conflicts).where(eq(conflicts.organizationId, orgId));
  await db
    .update(datasets)
    .set({
      status: "completed",
      duplicateCount: dupes.filter((e) => e.status !== "singleton").length,
      conflictCount: conf.length,
      updatedAt: new Date(),
    })
    .where(eq(datasets.id, datasetId));

  await notify({
    organizationId: orgId,
    type: "import_completed",
    title: "Import completed",
    body: `${dataset.name}: ${valid} rows processed`,
  });
}

export async function rebuildOrg(orgId: string, jobId?: string) {
  if (jobId) await log(jobId, "Finding duplicates");
  const settings = await loadSettings(orgId);

  await db.delete(fieldValues).where(eq(fieldValues.organizationId, orgId));
  await db.delete(reviewTasks).where(eq(reviewTasks.organizationId, orgId));
  await db.delete(canonicalFieldValues).where(eq(canonicalFieldValues.organizationId, orgId));
  await db.delete(canonicalRecords).where(eq(canonicalRecords.organizationId, orgId));
  await db.delete(conflicts).where(eq(conflicts.organizationId, orgId));
  await db.delete(entityMatches).where(eq(entityMatches.organizationId, orgId));
  await db.delete(entities).where(eq(entities.organizationId, orgId));

  const recs = await db
    .select({
      id: sourceRecords.id,
      sourceId: sourceRecords.sourceId,
      fields: normalizedRecords.fields,
      updatedAt: sourceRecords.sourceUpdatedAt,
      error: sourceRecords.error,
    })
    .from(sourceRecords)
    .innerJoin(normalizedRecords, eq(normalizedRecords.sourceRecordId, sourceRecords.id))
    .where(eq(sourceRecords.organizationId, orgId));

  const usable = recs.filter((r) => !r.error);
  const matchInput = usable.map((r) => ({
    id: r.id,
    sourceId: r.sourceId,
    fields: r.fields as NormalizedFields,
  }));

  const { clusters } = clusterRecords(matchInput, settings.weights, settings.thresholds);
  const clustered = new Set(clusters.flatMap((c) => c.recordIds));

  const sourceRows = await db.select().from(sources).where(eq(sources.organizationId, orgId));
  const sourceById = new Map(sourceRows.map((s) => [s.id, s]));
  const rules = await db.select().from(sourceFieldRules).where(eq(sourceFieldRules.organizationId, orgId));

  const attachSingletons: string[][] = [];
  for (const r of usable) {
    if (!clustered.has(r.id)) attachSingletons.push([r.id]);
  }

  const allGroups = [
    ...clusters.map((c) => ({ ids: c.recordIds, score: c.score, reasons: c.reasons, fields: c.matchedFields })),
    ...attachSingletons.map((ids) => ({ ids, score: 1, reasons: ["Single source record"], fields: [] as string[] })),
  ];

  if (jobId) await log(jobId, `Detected ${clusters.length} duplicate groups`);

  for (const g of allGroups) {
    const members = usable.filter((r) => g.ids.includes(r.id));
    const names = members.map((m) => (m.fields as NormalizedFields).name).filter(Boolean) as string[];
    const display = names.sort((a, b) => b.length - a.length)[0] ?? "Unknown entity";
    const emails = members.map((m) => (m.fields as NormalizedFields).email).filter(Boolean);
    const phones = members.map((m) => (m.fields as NormalizedFields).phone).filter(Boolean);
    const isGroup = g.ids.length > 1;
    const [entity] = await db
      .insert(entities)
      .values({
        organizationId: orgId,
        displayName: display.replace(/\b\w/g, (c) => c.toUpperCase()),
        primaryEmail: emails[0],
        primaryPhone: phones[0],
        status: isGroup ? "needs_review" : "singleton",
        confidence: g.score,
      })
      .returning();

    for (const m of members) {
      await db.insert(entityMatches).values({
        organizationId: orgId,
        entityId: entity!.id,
        sourceRecordId: m.id,
        matchScore: g.score,
        matchReason: g.reasons.join("; "),
        matchedFields: g.fields,
        confidence: g.score,
        status: isGroup ? (g.score >= settings.thresholds.autoMatch ? "confirmed" : "proposed") : "confirmed",
      });
      const fields = m.fields as NormalizedFields;
      const raw = (await db.select().from(sourceRecords).where(eq(sourceRecords.id, m.id)))[0];
      const mapped = (raw?.raw as { mapped?: Record<string, string> } | undefined)?.mapped ?? {};
      for (const field of CANONICAL_FIELDS) {
        const nv = fields[field];
        const rv = mapped[field];
        if (!nv && !rv) continue;
        await db.insert(fieldValues).values({
          organizationId: orgId,
          entityId: entity!.id,
          sourceRecordId: m.id,
          sourceId: m.sourceId,
          fieldName: field,
          rawValue: rv ?? nv ?? null,
          normalizedValue: nv ?? null,
          sourceUpdatedAt: m.updatedAt,
        });
      }
    }

    if (isGroup) {
      await audit({
        organizationId: orgId,
        action: "ENTITY_MATCHED",
        entityType: "entity",
        entityId: entity!.id,
        metadata: { score: g.score, reasons: g.reasons, size: g.ids.length },
      });
    }

    await reconcileEntity(orgId, entity!.id, sourceById, rules, settings, jobId);
  }

  const openReview = await db
    .select()
    .from(conflicts)
    .where(and(eq(conflicts.organizationId, orgId), eq(conflicts.status, "pending_review")));
  if (openReview.length) {
    await notify({
      organizationId: orgId,
      type: "review_required",
      title: "Review required",
      body: `${openReview.length} conflict(s) need a human decision.`,
    });
  }
}

async function loadSettings(orgId: string): Promise<OrgSettings> {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const s = (row?.settings ?? {}) as Partial<OrgSettings>;
  const d = defaultOrgSettings();
  return {
    weights: { ...d.weights, ...(s.weights ?? {}) },
    thresholds: { ...d.thresholds, ...(s.thresholds ?? {}) },
    fieldImportance: { ...d.fieldImportance, ...(s.fieldImportance ?? {}) },
  };
}

export async function reconcileEntity(
  orgId: string,
  entityId: string,
  sourceById: Map<string, typeof sources.$inferSelect>,
  rules: (typeof sourceFieldRules.$inferSelect)[],
  settings: OrgSettings,
  jobId?: string,
) {
  const fvs = await db.select().from(fieldValues).where(and(eq(fieldValues.organizationId, orgId), eq(fieldValues.entityId, entityId)));
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1);
  if (!entity) return;

  let [canon] = await db.select().from(canonicalRecords).where(eq(canonicalRecords.entityId, entityId)).limit(1);
  if (!canon) {
    [canon] = await db
      .insert(canonicalRecords)
      .values({ organizationId: orgId, entityId, status: "draft", confidence: entity.confidence })
      .returning();
    await audit({
      organizationId: orgId,
      action: "CANONICAL_RECORD_CREATED",
      entityType: "canonical_record",
      entityId: canon!.id,
    });
  }

  const fields = [...new Set(fvs.map((f) => f.fieldName))];
  let confidences: number[] = [];
  let pending = 0;
  let auto = 0;

  for (const field of fields) {
    const occ: FieldOccurrence[] = fvs
      .filter((f) => f.fieldName === field)
      .map((f) => {
        const src = sourceById.get(f.sourceId);
        return {
          sourceRecordId: f.sourceRecordId,
          sourceId: f.sourceId,
          sourceName: src?.name ?? "Source",
          reliability: src?.reliability ?? 50,
          rawValue: f.rawValue ?? "",
          normalizedValue: f.normalizedValue ?? "",
          updatedAt: f.sourceUpdatedAt,
        };
      });
    const detected = detectFieldConflict(field, occ);
    const rec = recommendValue(
      field,
      occ,
      rules.map((r) => ({
        sourceId: r.sourceId,
        fieldName: r.fieldName,
        authorityScore: r.authorityScore,
        priorityRank: r.priorityRank,
      })),
    );
    if (!rec) continue;
    let explanation = rec.explanation;
    explanation = await maybePolishExplanation(explanation, `Field ${field} for ${entity.displayName}`);

    if (detected.isConflict) {
      const sev = conflictSeverity({
        field,
        distinctCount: detected.distinctNormalized.length,
        sourceCount: detected.occurrences.length,
        minReliability: Math.min(...occ.map((o) => o.reliability)),
        maxReliability: Math.max(...occ.map((o) => o.reliability)),
        importance: settings.fieldImportance,
      });
      const path = resolutionPath(rec.confidence, settings.thresholds);
      const status = path === "auto" ? "auto_resolved" : "pending_review";
      const [c] = await db
        .insert(conflicts)
        .values({
          organizationId: orgId,
          entityId,
          fieldName: field,
          severity: sev,
          status,
          recommendedValue: rec.rawValue,
          recommendedRaw: rec.rawValue,
          recommendedSourceId: rec.sourceId,
          confidence: rec.confidence,
          explanation,
          reasons: rec.reasons,
          candidates: occ,
        })
        .returning();
      await audit({
        organizationId: orgId,
        action: "CONFLICT_DETECTED",
        entityType: "conflict",
        entityId: c!.id,
        metadata: { field, severity: sev },
      });
      if (status === "auto_resolved") {
        auto++;
        const [dec] = await db
          .insert(reconciliationDecisions)
          .values({
            organizationId: orgId,
            conflictId: c!.id,
            entityId,
            action: "auto_resolve",
            chosenValue: rec.rawValue,
            method: "auto",
            reason: explanation,
          })
          .returning();
        await writeCanonicalField(orgId, canon!.id, field, rec, dec!.id, occ);
        await audit({
          organizationId: orgId,
          action: "CONFLICT_AUTO_RESOLVED",
          entityType: "conflict",
          entityId: c!.id,
          newValue: { value: rec.rawValue },
          reason: explanation,
        });
      } else {
        pending++;
        await db.insert(reviewTasks).values({
          organizationId: orgId,
          conflictId: c!.id,
          entityId,
          status: "open",
        });
        await writeCanonicalField(orgId, canon!.id, field, rec, null, occ, true);
      }
    } else {
      await writeCanonicalField(orgId, canon!.id, field, rec, null, occ);
    }
    confidences.push(rec.confidence);
  }

  const avg = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : entity.confidence ?? 0;
  const status = pending > 0 ? "needs_review" : "reconciled";
  await db
    .update(canonicalRecords)
    .set({ status, confidence: avg, updatedAt: new Date() })
    .where(eq(canonicalRecords.id, canon!.id));
  await db
    .update(entities)
    .set({
      status,
      confidence: avg,
      updatedAt: new Date(),
      displayName: entity.displayName,
    })
    .where(eq(entities.id, entityId));

  if (jobId) await log(jobId, `Entity ${entity.displayName}: ${auto} auto-resolved, ${pending} in review`);
}

async function writeCanonicalField(
  orgId: string,
  canonicalId: string,
  field: string,
  rec: NonNullable<ReturnType<typeof recommendValue>>,
  decisionId: string | null,
  occ: FieldOccurrence[],
  provisional = false,
) {
  await db
    .delete(canonicalFieldValues)
    .where(and(eq(canonicalFieldValues.canonicalRecordId, canonicalId), eq(canonicalFieldValues.fieldName, field)));
  await db.insert(canonicalFieldValues).values({
    organizationId: orgId,
    canonicalRecordId: canonicalId,
    fieldName: field,
    value: rec.rawValue,
    rawValue: rec.rawValue,
    sourceId: rec.sourceId,
    confidence: rec.confidence,
    decisionId,
    evidence: {
      provisional,
      explanation: rec.explanation,
      reasons: rec.reasons,
      scores: rec.scores,
      sources: occ,
    },
  });
}

export { loadSettings };
