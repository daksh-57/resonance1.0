import { CANONICAL_FIELDS, autoMapHeader, defaultOrgSettings } from "@reconcile/shared";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { z } from "zod";
import { env, isProd } from "./config.ts";
import { db } from "./db/client.ts";
import {
  apiKeys,
  auditEvents,
  canonicalFieldValues,
  canonicalRecords,
  conflicts,
  datasets,
  entities,
  entityMatches,
  jobLogs,
  modelFeedback,
  modelVersions,
  notifications,
  organizations,
  passwordResetTokens,
  reconciliationDecisions,
  reconciliationJobs,
  reviewTasks,
  scheduledImports,
  sessions,
  sourceFieldRules,
  sourceRecords,
  sources,
  uploadedFiles,
  users,
} from "./db/schema.ts";
import { enqueueJob, loadSettings, processNextJob, rebuildOrg, runImportAndReconcile } from "./jobs/processor.ts";
import { audit } from "./lib/audit.ts";
import { encryptSecret, randomToken, sha256 } from "./lib/crypto.ts";
import { parseUpload } from "./lib/parse.ts";
import { saveUpload } from "./lib/storage.ts";
import { attachAuth, requireAuth } from "./middleware/auth.ts";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trainLogistic, type FeedbackRow } from "@reconcile/engine";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(csv|xlsx|xls|json|txt)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only CSV, XLSX, and JSON files are allowed") as any, ok);
  },
});

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true });

function setSessionCookie(res: express.Response, sid: string) {
  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

async function createSession(userId: string, organizationId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const [sess] = await db.insert(sessions).values({ userId, organizationId, expiresAt }).returning();
  return sess!;
}

function csvEscape(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const line = (r: Record<string, unknown>) =>
    headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",");
  return [headers.join(","), ...rows.map(line)].join("\n");
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = env.corsOrigin.split(",").map((s) => s.trim());
    if (origin && allowed.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(attachAuth);

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "reconcileai" }));

  app.post("/api/auth/register", authLimit, async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string(),
        organizationName: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid registration details", details: parsed.error.flatten() });
    if (parsed.data.password !== parsed.data.confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
    const email = parsed.data.email.toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return res.status(409).json({ error: "Email already registered" });
    const slug = `${email.split("@")[0]}-${randomToken(4)}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const [org] = await db
      .insert(organizations)
      .values({
        name: parsed.data.organizationName || `${parsed.data.name}'s workspace`,
        slug,
        settings: defaultOrgSettings(),
      })
      .returning();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        organizationId: org!.id,
        email,
        passwordHash,
        name: parsed.data.name,
        role: "admin",
      })
      .returning();
    const sess = await createSession(user!.id, org!.id);
    setSessionCookie(res, sess.id);
    await audit({ organizationId: org!.id, actorUserId: user!.id, action: "USER_REGISTERED", entityType: "user", entityId: user!.id });
    res.status(201).json({ user: { id: user!.id, email: user!.email, name: user!.name, organizationId: org!.id } });
  });

  app.post("/api/auth/login", authLimit, async (req, res) => {
    const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Email and password required" });
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const sess = await createSession(user.id, user.organizationId);
    setSessionCookie(res, sess.id);
    res.json({ user: { id: user.id, email: user.email, name: user.name, organizationId: user.organizationId } });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sid = req.cookies?.sid;
    if (sid) await db.delete(sessions).where(eq(sessions.id, sid));
    res.clearCookie("sid", { path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, req.auth!.organizationId));
    res.json({
      user: { id: req.auth!.userId, email: req.auth!.email, name: req.auth!.name, role: req.auth!.role, organizationId: req.auth!.organizationId },
      organization: org,
    });
  });

  app.post("/api/auth/forgot-password", authLimit, async (req, res) => {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Valid email required" });
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase()));
    const generic = { ok: true, message: "If that account exists, a reset link was issued." };
    if (!user) return res.json(generic);
    const token = randomToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const resetPath = `/reset-password?token=${token}`;
    if (!isProd && !env.smtpHost) return res.json({ ...generic, resetPath, token });
    res.json(generic);
  });

  app.post("/api/auth/reset-password", authLimit, async (req, res) => {
    const parsed = z.object({ token: z.string(), password: z.string().min(8) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Token and new password required" });
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, sha256(parsed.data.token)));
    if (!row || row.usedAt || row.expiresAt < new Date()) return res.status(400).json({ error: "Invalid or expired token" });
    const hash = await bcrypt.hash(parsed.data.password, 12);
    await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
    res.json({ ok: true });
  });

  const api = express.Router();
  api.use(requireAuth);

  api.get("/dashboard", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [recordCount] = await db.select({ n: sql<number>`count(*)::int` }).from(sourceRecords).where(eq(sourceRecords.organizationId, orgId));
    const [entityCount] = await db.select({ n: sql<number>`count(*)::int` }).from(entities).where(eq(entities.organizationId, orgId));
    const [dupeCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(entities)
      .where(and(eq(entities.organizationId, orgId), sql`${entities.status} <> 'singleton'`));
    const [conflictCount] = await db.select({ n: sql<number>`count(*)::int` }).from(conflicts).where(eq(conflicts.organizationId, orgId));
    const [autoCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conflicts)
      .where(and(eq(conflicts.organizationId, orgId), eq(conflicts.status, "auto_resolved")));
    const [reviewCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conflicts)
      .where(and(eq(conflicts.organizationId, orgId), eq(conflicts.status, "pending_review")));
    const resolved = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(conflicts)
      .where(and(eq(conflicts.organizationId, orgId), sql`${conflicts.status} in ('auto_resolved','approved','overridden')`));
    const [avg] = await db
      .select({ v: sql<number>`coalesce(avg(confidence),0)` })
      .from(conflicts)
      .where(eq(conflicts.organizationId, orgId));
    const bySource = await db
      .select({ sourceId: sourceRecords.sourceId, n: sql<number>`count(*)::int` })
      .from(sourceRecords)
      .where(eq(sourceRecords.organizationId, orgId))
      .groupBy(sourceRecords.sourceId);
    const srcNames = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const bySeverity = await db
      .select({ severity: conflicts.severity, n: sql<number>`count(*)::int` })
      .from(conflicts)
      .where(eq(conflicts.organizationId, orgId))
      .groupBy(conflicts.severity);
    const byStatus = await db
      .select({ status: conflicts.status, n: sql<number>`count(*)::int` })
      .from(conflicts)
      .where(eq(conflicts.organizationId, orgId))
      .groupBy(conflicts.status);
    const activity = await db.select().from(auditEvents).where(eq(auditEvents.organizationId, orgId)).orderBy(desc(auditEvents.createdAt)).limit(12);
    const totalC = conflictCount?.n ?? 0;
    const resN = resolved[0]?.n ?? 0;
    res.json({
      totals: {
        records: recordCount?.n ?? 0,
        entities: entityCount?.n ?? 0,
        duplicates: dupeCount?.n ?? 0,
        conflicts: totalC,
        autoResolved: autoCount?.n ?? 0,
        needsReview: reviewCount?.n ?? 0,
        resolutionRate: totalC ? resN / totalC : 0,
        averageConfidence: Number(avg?.v ?? 0),
      },
      charts: {
        recordsBySource: bySource.map((r) => ({
          source: srcNames.find((s) => s.id === r.sourceId)?.name ?? r.sourceId,
          count: r.n,
        })),
        severity: bySeverity,
        status: byStatus,
      },
      activity,
    });
  });

  api.get("/sources", async (req, res) => {
    const rows = await db.select().from(sources).where(eq(sources.organizationId, req.auth!.organizationId)).orderBy(sources.createdAt);
    res.json({ sources: rows });
  });

  api.post("/sources", async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(1),
        type: z.enum(["crm", "erp", "billing", "hr", "other", "api"]),
        description: z.string().optional(),
        reliability: z.number().int().min(0).max(100).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid source" });
    const [row] = await db
      .insert(sources)
      .values({
        organizationId: req.auth!.organizationId,
        createdBy: req.auth!.userId,
        ...parsed.data,
        reliability: parsed.data.reliability ?? 70,
      })
      .returning();
    await seedDefaultRules(req.auth!.organizationId, row!);
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "SOURCE_CREATED",
      entityType: "source",
      entityId: row!.id,
      newValue: row,
    });
    await notify({
      organizationId: req.auth!.organizationId,
      type: "source_created",
      title: "Source created",
      body: `"${row!.name}" is ready to receive data.`,
    });
    res.status(201).json({ source: row });
  });

  api.patch("/sources/:id", async (req, res) => {
    const [row] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.id, req.params.id), eq(sources.organizationId, req.auth!.organizationId)));
    if (!row) return res.status(404).json({ error: "Not found" });
    const parsed = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        reliability: z.number().int().min(0).max(100).optional(),
        active: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
    const [updated] = await db
      .update(sources)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(sources.id, row.id))
      .returning();
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "SOURCE_UPDATED",
      entityType: "source",
      entityId: row.id,
      oldValue: row,
      newValue: updated,
    });
    res.json({ source: updated });
  });

  api.get("/rules", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const rules = await db.select().from(sourceFieldRules).where(eq(sourceFieldRules.organizationId, orgId));
    const settings = await loadSettings(orgId);
    res.json({ sources: src, rules, settings, fields: CANONICAL_FIELDS });
  });

  api.put("/rules", async (req, res) => {
    const parsed = z
      .object({
        rules: z.array(
          z.object({
            sourceId: z.string().uuid(),
            fieldName: z.string(),
            authorityScore: z.number().int().min(0).max(100),
            priorityRank: z.number().int().min(1).max(100),
          }),
        ),
        settings: z
          .object({
            weights: z.record(z.number()).optional(),
            thresholds: z
              .object({
                autoMatch: z.number(),
                reviewMatch: z.number(),
                autoResolve: z.number(),
                mediumConfidence: z.number(),
              })
              .partial()
              .optional(),
            fieldImportance: z.record(z.string()).optional(),
          })
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid rules" });
    const orgId = req.auth!.organizationId;
    await db.delete(sourceFieldRules).where(eq(sourceFieldRules.organizationId, orgId));
    if (parsed.data.rules.length) {
      await db.insert(sourceFieldRules).values(parsed.data.rules.map((r) => ({ ...r, organizationId: orgId })));
    }
    if (parsed.data.settings) {
      const current = await loadSettings(orgId);
      const next = {
        weights: { ...current.weights, ...(parsed.data.settings.weights ?? {}) },
        thresholds: { ...current.thresholds, ...(parsed.data.settings.thresholds ?? {}) },
        fieldImportance: { ...current.fieldImportance, ...(parsed.data.settings.fieldImportance ?? {}) },
      };
      await db.update(organizations).set({ settings: next, updatedAt: new Date() }).where(eq(organizations.id, orgId));
    }
    await audit({
      organizationId: orgId,
      actorUserId: req.auth!.userId,
      action: "SOURCE_RULE_CHANGED",
      entityType: "rules",
    });
    res.json({ ok: true });
  });

  api.get("/datasets", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const rows = await db.select().from(datasets).where(eq(datasets.organizationId, orgId)).orderBy(desc(datasets.createdAt));
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const byId = new Map(src.map((s) => [s.id, s]));
    res.json({ datasets: rows.map((r) => ({ ...r, sourceName: byId.get(r.sourceId)?.name })) });
  });

  api.get("/datasets/:id", async (req, res) => {
    const [ds] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, req.params.id), eq(datasets.organizationId, req.auth!.organizationId)));
    if (!ds) return res.status(404).json({ error: "Not found" });
    const files = await db.select().from(uploadedFiles).where(eq(uploadedFiles.datasetId, ds.id));
    const jobs = await db.select().from(reconciliationJobs).where(eq(reconciliationJobs.datasetId, ds.id)).orderBy(desc(reconciliationJobs.createdAt));
    res.json({ dataset: ds, files, jobs });
  });

  api.get("/datasets/:id/files/:fileId/download", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [file] = await db.select().from(uploadedFiles).where(and(eq(uploadedFiles.id, req.params.fileId), eq(uploadedFiles.organizationId, orgId)));
    if (!file) return res.status(404).json({ error: "File not found" });
    const fs = await import("node:fs");
    if (!fs.existsSync(file.storagePath)) return res.status(404).json({ error: "Storage missing" });
    res.download(file.storagePath, file.originalName);
  });

  api.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "File required" });
      const orgId = req.auth!.organizationId;
      const userId = req.auth!.userId;
      let sourceId = String(req.body.sourceId ?? "").trim();
      let srcRow = sourceId ? await db.select().from(sources).where(and(eq(sources.id, sourceId), eq(sources.organizationId, orgId))) : [];
      let source = srcRow[0];
      if (!source) {
        [source] = await db.insert(sources).values({ organizationId: orgId, name: "Uploads", type: "other", description: "Default upload source", createdBy: userId }).returning();
        sourceId = source!.id;
      }
      const [ds] = await db
        .insert(datasets)
        .values({
          organizationId: orgId,
          sourceId: source!.id,
          name: req.file.originalname,
          status: "uploaded",
          createdBy: userId,
        })
        .returning();
      const saved = await saveUpload(req.auth!.organizationId, crypto.randomUUID(), req.file.originalname, req.file.buffer);
      await db.insert(uploadedFiles).values({
        organizationId: req.auth!.organizationId,
        datasetId: ds!.id,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: saved.path,
        sha256: saved.sha256,
      });
      const parsed = parseUpload(req.file.originalname, req.file.buffer);
      const mapping: Record<string, string> = {};
      for (const h of parsed.headers) mapping[h] = autoMapHeader(h) ?? "";
      await db.update(datasets).set({ mapping, rowCount: parsed.rows.length }).where(eq(datasets.id, ds!.id));
      await audit({
        organizationId: req.auth!.organizationId,
        actorUserId: req.auth!.userId,
        action: "FILE_UPLOADED",
        entityType: "dataset",
        entityId: ds!.id,
        metadata: { name: req.file.originalname, size: req.file.size },
      });
      res.status(201).json({
        datasetId: ds!.id,
        headers: parsed.headers,
        mapping,
        preview: parsed.rows.slice(0, 25),
        errors: parsed.errors,
        rowCount: parsed.rows.length,
        fields: CANONICAL_FIELDS,
      });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  api.post("/datasets/:id/mapping", async (req, res) => {
    const [ds] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, req.params.id), eq(datasets.organizationId, req.auth!.organizationId)));
    if (!ds) return res.status(404).json({ error: "Not found" });
    const mapping = z.record(z.string()).parse(req.body.mapping ?? {});
    await db.update(datasets).set({ mapping, updatedAt: new Date() }).where(eq(datasets.id, ds.id));
    res.json({ ok: true, mapping });
  });

  api.post("/datasets/:id/import", async (req, res) => {
    const [ds] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, req.params.id), eq(datasets.organizationId, req.auth!.organizationId)));
    if (!ds) return res.status(404).json({ error: "Not found" });
    const job = await enqueueJob({ organizationId: req.auth!.organizationId, datasetId: ds.id, type: "import_and_reconcile" });
    void processNextJob();
    res.status(202).json({ job });
  });

  api.delete("/datasets/:id", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [ds] = await db.select().from(datasets).where(and(eq(datasets.id, req.params.id), eq(datasets.organizationId, orgId)));
    if (!ds) return res.status(404).json({ error: "Not found" });
    const files = await db.select().from(uploadedFiles).where(and(eq(uploadedFiles.datasetId, ds.id), eq(uploadedFiles.organizationId, orgId)));
    await db.delete(uploadedFiles).where(and(eq(uploadedFiles.datasetId, ds.id), eq(uploadedFiles.organizationId, orgId)));
    await db.delete(datasets).where(eq(datasets.id, ds.id));
    for (const f of files) {
      try { await unlink(f.storagePath); } catch {}
    }
    await rebuildOrg(orgId);
    await audit({
      organizationId: orgId,
      actorUserId: req.auth!.userId,
      action: "DATASET_DELETED",
      entityType: "dataset",
      entityId: ds.id,
      metadata: { name: ds.name },
    });
    res.json({ ok: true });
  });

  api.get("/jobs/:id", async (req, res) => {
    const [job] = await db
      .select()
      .from(reconciliationJobs)
      .where(and(eq(reconciliationJobs.id, req.params.id), eq(reconciliationJobs.organizationId, req.auth!.organizationId)));
    if (!job) return res.status(404).json({ error: "Not found" });
    const logs = await db.select().from(jobLogs).where(eq(jobLogs.jobId, job.id)).orderBy(jobLogs.createdAt);
    res.json({ job, logs });
  });

  api.get("/entities", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize ?? 25)));
    const q = String(req.query.q ?? "").trim();
    const status = String(req.query.status ?? "");
    const conds = [eq(entities.organizationId, orgId)];
    if (status) conds.push(eq(entities.status, status));
    if (q) conds.push(or(ilike(entities.displayName, `%${q}%`), ilike(entities.primaryEmail, `%${q}%`), ilike(entities.primaryPhone, `%${q}%`))!);
    const rows = await db
      .select()
      .from(entities)
      .where(and(...conds))
      .orderBy(desc(entities.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(entities).where(and(...conds));
    res.json({ entities: rows, total: n, page, pageSize });
  });

  api.get("/entities/:id", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [entity] = await db.select().from(entities).where(and(eq(entities.id, req.params.id), eq(entities.organizationId, orgId)));
    if (!entity) return res.status(404).json({ error: "Not found" });
    const matches = await db.select().from(entityMatches).where(eq(entityMatches.entityId, entity.id));
    const recIds = matches.map((m) => m.sourceRecordId);
    const recs = recIds.length
      ? await db.select().from(sourceRecords).where(and(eq(sourceRecords.organizationId, orgId), inArray(sourceRecords.id, recIds)))
      : [];
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const conf = await db.select().from(conflicts).where(eq(conflicts.entityId, entity.id));
    const [canon] = await db.select().from(canonicalRecords).where(eq(canonicalRecords.entityId, entity.id));
    const fields = canon
      ? await db.select().from(canonicalFieldValues).where(eq(canonicalFieldValues.canonicalRecordId, canon.id))
      : [];
    const history = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.organizationId, orgId), eq(auditEvents.entityId, entity.id)))
      .orderBy(desc(auditEvents.createdAt));
    res.json({
      entity,
      matches,
      sourceRecords: recs.map((r) => ({ ...r, sourceName: src.find((s) => s.id === r.sourceId)?.name })),
      conflicts: conf,
      canonical: canon,
      canonicalFields: fields,
      audit: history,
      sources: src,
    });
  });

  api.post("/entities/:id/confirm-match", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [entity] = await db.select().from(entities).where(and(eq(entities.id, req.params.id), eq(entities.organizationId, orgId)));
    if (!entity) return res.status(404).json({ error: "Not found" });
    await db.update(entityMatches).set({ status: "confirmed" }).where(and(eq(entityMatches.entityId, entity.id), eq(entityMatches.status, "proposed")));
    await db.update(entities).set({ status: "confirmed", updatedAt: new Date() }).where(eq(entities.id, entity.id));
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "DUPLICATE_CONFIRMED",
      entityType: "entity",
      entityId: entity.id,
    });
    await notify({
      organizationId: req.auth!.organizationId,
      type: "entity_confirmed",
      title: "Entity confirmed",
      body: `"${entity.displayName}" match confirmed.`,
    });
    res.json({ ok: true });
  });

  api.post("/entities/:id/reject-match", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [entity] = await db.select().from(entities).where(and(eq(entities.id, req.params.id), eq(entities.organizationId, orgId)));
    if (!entity) return res.status(404).json({ error: "Not found" });
    await db.update(entityMatches).set({ status: "rejected" }).where(and(eq(entityMatches.entityId, entity.id), eq(entityMatches.status, "proposed")));
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "DUPLICATE_REJECTED",
      entityType: "entity",
      entityId: entity.id,
    });
    await notify({
      organizationId: req.auth!.organizationId,
      type: "entity_rejected",
      title: "Entity match rejected",
      body: `"${entity.displayName}" match was rejected.`,
    });
    res.json({ ok: true });
  });

  api.post("/entities/:id/split", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const parsed = z.object({ sourceRecordIds: z.array(z.string().uuid()).min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "sourceRecordIds required" });
    const [entity] = await db.select().from(entities).where(and(eq(entities.id, req.params.id), eq(entities.organizationId, orgId)));
    if (!entity) return res.status(404).json({ error: "Not found" });
    const [neu] = await db
      .insert(entities)
      .values({ organizationId: orgId, displayName: `${entity.displayName} (split)`, status: "open" })
      .returning();
    for (const rid of parsed.data.sourceRecordIds) {
      await db
        .update(entityMatches)
        .set({ entityId: neu!.id, status: "split" })
        .where(and(eq(entityMatches.entityId, entity.id), eq(entityMatches.sourceRecordId, rid), eq(entityMatches.organizationId, orgId)));
    }
    await audit({
      organizationId: orgId,
      actorUserId: req.auth!.userId,
      action: "ENTITY_SPLIT",
      entityType: "entity",
      entityId: entity.id,
      newValue: { newEntityId: neu!.id },
    });
    res.json({ entity: neu });
  });

  api.get("/duplicates", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const groups = await db
      .select()
      .from(entities)
      .where(and(eq(entities.organizationId, orgId), sql`${entities.status} <> 'singleton'`))
      .orderBy(desc(entities.confidence));
    res.json({ groups });
  });

  api.get("/conflicts", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize ?? 25)));
    const conds = [eq(conflicts.organizationId, orgId)];
    if (req.query.status) conds.push(eq(conflicts.status, String(req.query.status)));
    if (req.query.severity) conds.push(eq(conflicts.severity, String(req.query.severity)));
    if (req.query.field) conds.push(eq(conflicts.fieldName, String(req.query.field)));
    const rows = await db
      .select()
      .from(conflicts)
      .where(and(...conds))
      .orderBy(desc(conflicts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const ents = await db.select().from(entities).where(eq(entities.organizationId, orgId));
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(conflicts).where(and(...conds));
    res.json({
      conflicts: rows.map((c) => ({ ...c, entityName: ents.find((e) => e.id === c.entityId)?.displayName })),
      total: n,
      page,
      pageSize,
    });
  });

  api.get("/conflicts/:id", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [c] = await db.select().from(conflicts).where(and(eq(conflicts.id, req.params.id), eq(conflicts.organizationId, orgId)));
    if (!c) return res.status(404).json({ error: "Not found" });
    const [entity] = await db.select().from(entities).where(eq(entities.id, c.entityId));
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const matches = await db.select().from(entityMatches).where(eq(entityMatches.entityId, c.entityId));
    const recs = await db.select().from(sourceRecords).where(eq(sourceRecords.organizationId, orgId));
    const related = recs.filter((r) => matches.some((m) => m.sourceRecordId === r.id));
    res.json({ conflict: c, entity, sources: src, sourceRecords: related });
  });

  api.post("/conflicts/:id/resolve", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const parsed = z
      .object({
        action: z.enum(["approve", "reject", "choose", "edit"]),
        value: z.string().optional(),
        reason: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid resolution" });
    const [c] = await db.select().from(conflicts).where(and(eq(conflicts.id, req.params.id), eq(conflicts.organizationId, orgId)));
    if (!c) return res.status(404).json({ error: "Not found" });
    let chosen = c.recommendedValue ?? "";
    let status = "approved";
    let actionName: "DECISION_APPROVED" | "DECISION_REJECTED" | "DECISION_OVERRIDDEN" = "DECISION_APPROVED";
    if (parsed.data.action === "reject") {
      status = "rejected";
      actionName = "DECISION_REJECTED";
    } else if (parsed.data.action === "choose" || parsed.data.action === "edit") {
      if (!parsed.data.value) return res.status(400).json({ error: "Value required" });
      chosen = parsed.data.value;
      status = "overridden";
      actionName = "DECISION_OVERRIDDEN";
    }
    const [dec] = await db
      .insert(reconciliationDecisions)
      .values({
        organizationId: orgId,
        conflictId: c.id,
        entityId: c.entityId,
        actorUserId: req.auth!.userId,
        action: parsed.data.action,
        chosenValue: chosen,
        previousValue: c.recommendedValue,
        reason: parsed.data.reason,
        method: "human",
      })
      .returning();
    await db.update(conflicts).set({ status, updatedAt: new Date() }).where(eq(conflicts.id, c.id));
    await db
      .update(reviewTasks)
      .set({ status: "closed" })
      .where(and(eq(reviewTasks.conflictId, c.id), eq(reviewTasks.organizationId, orgId)));
    const [canon] = await db.select().from(canonicalRecords).where(eq(canonicalRecords.entityId, c.entityId));
    if (canon && parsed.data.action !== "reject") {
      await db
        .delete(canonicalFieldValues)
        .where(and(eq(canonicalFieldValues.canonicalRecordId, canon.id), eq(canonicalFieldValues.fieldName, c.fieldName)));
      await db.insert(canonicalFieldValues).values({
        organizationId: orgId,
        canonicalRecordId: canon.id,
        fieldName: c.fieldName,
        value: chosen,
        rawValue: chosen,
        sourceId: c.recommendedSourceId,
        confidence: 1,
        decisionId: dec!.id,
        evidence: { human: true, action: parsed.data.action, reason: parsed.data.reason },
      });
      await db.update(canonicalRecords).set({ updatedAt: new Date(), status: "reconciled" }).where(eq(canonicalRecords.id, canon.id));
    }
    await db.insert(modelFeedback).values({
      organizationId: orgId,
      conflictId: c.id,
      entityId: c.entityId,
      features: { field: c.fieldName, predicted: c.recommendedValue, confidence: c.confidence },
      predictedValue: c.recommendedValue,
      predictedConfidence: c.confidence,
      humanValue: chosen,
      accepted: parsed.data.action === "approve",
      modelVersion: "deterministic",
    });
    await maybeRetrain(orgId);
    const remaining = await db.select().from(conflicts).where(and(eq(conflicts.entityId, c.entityId), eq(conflicts.organizationId, orgId), sql`${conflicts.status} not in ('approved','rejected','overridden')`));
    if (!remaining.length) {
      await db.update(entities).set({ status: "reconciled", updatedAt: new Date() }).where(eq(entities.id, c.entityId));
      await db.update(canonicalRecords).set({ status: "reconciled", updatedAt: new Date() }).where(eq(canonicalRecords.entityId, c.entityId));
    }
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: actionName,
      entityType: "conflict",
      entityId: c.id,
      oldValue: { value: c.recommendedValue },
      newValue: { value: chosen },
      reason: parsed.data.reason,
    });
    await notify({
      organizationId: req.auth!.organizationId,
      type: "conflict_resolved",
      title: "Conflict resolved",
      body: `${c.fieldName.replace(/_/g, " ")} conflict was ${parsed.data.action}.`,
    });
    res.json({ ok: true, conflictId: c.id, status, chosen });
  });

  api.get("/review", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const tasks = await db
      .select()
      .from(reviewTasks)
      .where(and(eq(reviewTasks.organizationId, orgId), eq(reviewTasks.status, "open")))
      .orderBy(desc(reviewTasks.createdAt));
    const confIds = tasks.map((t) => t.conflictId);
    const confs = confIds.length ? await db.select().from(conflicts).where(eq(conflicts.organizationId, orgId)) : [];
    const ents = await db.select().from(entities).where(eq(entities.organizationId, orgId));
    res.json({
      tasks: tasks.map((t) => {
        const c = confs.find((x) => x.id === t.conflictId);
        return {
          ...t,
          conflict: c,
          entityName: ents.find((e) => e.id === t.entityId)?.displayName,
        };
      }),
    });
  });

  api.get("/canonical-records", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const rows = await db.select().from(canonicalRecords).where(eq(canonicalRecords.organizationId, orgId)).orderBy(desc(canonicalRecords.updatedAt));
    const ents = await db.select().from(entities).where(eq(entities.organizationId, orgId));
    res.json({ records: rows.map((r) => ({ ...r, displayName: ents.find((e) => e.id === r.entityId)?.displayName })) });
  });

  api.get("/canonical-records/:id", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const [row] = await db
      .select()
      .from(canonicalRecords)
      .where(and(eq(canonicalRecords.id, req.params.id), eq(canonicalRecords.organizationId, orgId)));
    if (!row) return res.status(404).json({ error: "Not found" });
    const fields = await db.select().from(canonicalFieldValues).where(eq(canonicalFieldValues.canonicalRecordId, row.id));
    const [entity] = await db.select().from(entities).where(eq(entities.id, row.entityId));
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    res.json({ record: row, fields, entity, sources: src });
  });

  api.get("/audit", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const conds = [eq(auditEvents.organizationId, orgId)];
    if (req.query.action) conds.push(eq(auditEvents.action, String(req.query.action)));
    const rows = await db.select().from(auditEvents).where(and(...conds)).orderBy(desc(auditEvents.createdAt)).limit(200);
    res.json({ events: rows });
  });

  api.get("/search", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ entities: [], conflicts: [], records: [] });
    const orgId = req.auth!.organizationId;
    const like = `%${q}%`;
    const ents = await db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.organizationId, orgId),
          or(ilike(entities.displayName, like), ilike(entities.primaryEmail, like), ilike(entities.primaryPhone, like), sql`${entities.id}::text ilike ${like}`),
        ),
      )
      .limit(20);
    const confs = await db
      .select()
      .from(conflicts)
      .where(and(eq(conflicts.organizationId, orgId), sql`${conflicts.id}::text ilike ${like}`))
      .limit(10);
    res.json({ entities: ents, conflicts: confs });
  });

  api.get("/notifications", async (req, res) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.organizationId, req.auth!.organizationId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json({ notifications: rows });
  });

  api.post("/notifications/:id/read", async (req, res) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.organizationId, req.auth!.organizationId)));
    res.json({ ok: true });
  });

  api.get("/settings", async (req, res) => {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, req.auth!.organizationId));
    const [user] = await db.select().from(users).where(eq(users.id, req.auth!.userId));
    res.json({ organization: org, profile: { name: user?.name, email: user?.email, role: user?.role } });
  });

  api.patch("/settings", async (req, res) => {
    const parsed = z
      .object({ organizationName: z.string().optional(), name: z.string().optional() })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid settings" });
    if (parsed.data.organizationName) {
      await db
        .update(organizations)
        .set({ name: parsed.data.organizationName, updatedAt: new Date() })
        .where(eq(organizations.id, req.auth!.organizationId));
    }
    if (parsed.data.name) {
      await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, req.auth!.userId));
    }
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "SETTINGS_CHANGED",
      entityType: "organization",
      entityId: req.auth!.organizationId,
    });
    res.json({ ok: true });
  });

  api.get("/api-keys", async (req, res) => {
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.organizationId, req.auth!.organizationId));
    res.json({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
        createdAt: k.createdAt,
      })),
    });
  });

  api.post("/api-keys", async (req, res) => {
    const name = z.string().min(1).parse(req.body.name ?? "Default");
    const raw = `rai_${randomToken(24)}`;
    const [row] = await db
      .insert(apiKeys)
      .values({
        organizationId: req.auth!.organizationId,
        name,
        keyPrefix: raw.slice(0, 10),
        keyHash: sha256(raw),
        createdBy: req.auth!.userId,
      })
      .returning();
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "API_KEY_CREATED",
      entityType: "api_key",
      entityId: row!.id,
    });
    res.status(201).json({ key: raw, id: row!.id, prefix: row!.keyPrefix });
  });

  api.post("/api-keys/:id/revoke", async (req, res) => {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.organizationId, req.auth!.organizationId)));
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "API_KEY_REVOKED",
      entityType: "api_key",
      entityId: req.params.id,
    });
    res.json({ ok: true });
  });

  api.post("/api-keys/:id/rotate", async (req, res) => {
    const raw = `rai_${randomToken(24)}`;
    const [row] = await db
      .update(apiKeys)
      .set({ keyHash: sha256(raw), keyPrefix: raw.slice(0, 10), revokedAt: null })
      .where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.organizationId, req.auth!.organizationId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ key: raw, prefix: row.keyPrefix });
  });

  api.get("/schedules", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const rows = await db.select().from(scheduledImports).where(eq(scheduledImports.organizationId, orgId));
    const src = await db.select().from(sources).where(eq(sources.organizationId, orgId));
    const byId = new Map(src.map((s) => [s.id, s]));
    res.json({ schedules: rows.map((s) => ({ ...s, sourceName: byId.get(s.sourceId)?.name, authConfigEnc: s.authConfigEnc ? "[encrypted]" : null })) });
  });

  api.post("/schedules", async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(1),
        sourceId: z.string().uuid(),
        interval: z.enum(["hourly", "daily", "weekly"]),
        endpoint: z.string().url().optional(),
        token: z.string().optional(),
        mapping: z.record(z.string()).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid schedule" });
    const [src] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.id, parsed.data.sourceId), eq(sources.organizationId, req.auth!.organizationId)));
    if (!src) return res.status(400).json({ error: "Invalid source" });
    const [row] = await db
      .insert(scheduledImports)
      .values({
        organizationId: req.auth!.organizationId,
        sourceId: src.id,
        name: parsed.data.name,
        interval: parsed.data.interval,
        endpoint: parsed.data.endpoint,
        authConfigEnc: parsed.data.token ? encryptSecret(JSON.stringify({ token: parsed.data.token })) : null,
        mapping: parsed.data.mapping ?? {},
      })
      .returning();
    await audit({
      organizationId: req.auth!.organizationId,
      actorUserId: req.auth!.userId,
      action: "SCHEDULE_CREATED",
      entityType: "schedule",
      entityId: row!.id,
    });
    res.status(201).json({ schedule: { ...row, authConfigEnc: row!.authConfigEnc ? "[encrypted]" : null } });
  });

  api.get("/export/:kind.csv", async (req, res) => {
    const orgId = req.auth!.organizationId;
    const kind = req.params.kind;
    let rows: Record<string, unknown>[] = [];
    if (kind === "canonical") {
      const recs = await db.select().from(canonicalRecords).where(eq(canonicalRecords.organizationId, orgId));
      const fields = await db.select().from(canonicalFieldValues).where(eq(canonicalFieldValues.organizationId, orgId));
      const ents = await db.select().from(entities).where(eq(entities.organizationId, orgId));
      rows = recs.map((r) => {
        const fs = fields.filter((f) => f.canonicalRecordId === r.id);
        const o: Record<string, unknown> = {
          id: r.id,
          entity: ents.find((e) => e.id === r.entityId)?.displayName,
          status: r.status,
          confidence: r.confidence,
        };
        for (const f of fs) o[f.fieldName] = f.value;
        return o;
      });
    } else if (kind === "conflicts") {
      rows = await db.select().from(conflicts).where(eq(conflicts.organizationId, orgId));
    } else if (kind === "duplicates") {
      rows = await db
        .select()
        .from(entities)
        .where(and(eq(entities.organizationId, orgId), sql`${entities.status} <> 'singleton'`));
    } else if (kind === "audit") {
      rows = await db.select().from(auditEvents).where(eq(auditEvents.organizationId, orgId));
    } else if (kind === "decisions") {
      rows = await db.select().from(reconciliationDecisions).where(eq(reconciliationDecisions.organizationId, orgId));
    } else return res.status(400).json({ error: "Unknown export" });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${kind}.csv`);
    res.send(csvEscape(rows as Record<string, unknown>[]));
  });

  api.get("/docs", (_req, res) => {
    res.json({
      title: "ReconcileAI REST API",
      auth: "Session cookie or Authorization: Bearer rai_...",
      endpoints: [
        "POST /api/auth/register|login|logout|forgot-password|reset-password",
        "GET /api/auth/me",
        "GET/POST /api/sources",
        "GET/PUT /api/rules",
        "POST /api/upload",
        "GET/POST /api/datasets",
        "DELETE /api/datasets/:id",
        "GET /api/entities",
        "GET /api/conflicts",
        "POST /api/conflicts/:id/resolve",
        "GET /api/canonical-records",
        "GET /api/audit",
        "POST /api/api-keys",
        "GET /api/export/canonical.csv",
      ],
    });
  });

  api.get("/ml", async (req, res) => {
    const versions = await db
      .select()
      .from(modelVersions)
      .where(eq(modelVersions.organizationId, req.auth!.organizationId))
      .orderBy(desc(modelVersions.trainedAt));
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(modelFeedback)
      .where(eq(modelFeedback.organizationId, req.auth!.organizationId));
    res.json({
      trained: versions.length > 0,
      versions,
      feedbackRows: n,
      note: versions.length
        ? "A logistic model was trained on reviewer feedback."
        : "Deterministic engine only. Model trains after 20 human decisions.",
    });
  });

  app.use("/api", api);

  app.use((err: Error | null, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err?.message || "Unexpected error" });
  });

  return app;
}

async function seedDefaultRules(orgId: string, source: { id: string; type: string }) {
  const presets: Record<string, { field: string; score: number; rank: number }[]> = {
    crm: [
      { field: "phone", score: 95, rank: 1 },
      { field: "email", score: 95, rank: 1 },
      { field: "name", score: 90, rank: 1 },
    ],
    erp: [{ field: "address", score: 95, rank: 1 }],
    billing: [{ field: "payment_status", score: 100, rank: 1 }],
    hr: [{ field: "salary", score: 100, rank: 1 }],
  };
  const list = presets[source.type] ?? [];
  if (!list.length) return;
  await db.insert(sourceFieldRules).values(
    list.map((r) => ({
      organizationId: orgId,
      sourceId: source.id,
      fieldName: r.field,
      authorityScore: r.score,
      priorityRank: r.rank,
    })),
  );
}

async function maybeRetrain(orgId: string) {
  const rows = await db.select().from(modelFeedback).where(eq(modelFeedback.organizationId, orgId));
  if (rows.length < 20) return;
  const data: FeedbackRow[] = rows.map((r) => {
    const f = r.features as { confidence?: number };
    return {
      features: [f.confidence ?? 0.5, r.accepted ? 1 : 0, r.predictedValue === r.humanValue ? 1 : 0],
      label: r.accepted ? 1 : 0,
    };
  });
  const model = trainLogistic(data);
  if (!model) return;
  await db.insert(modelVersions).values({
    organizationId: orgId,
    version: model.version,
    weights: model.weights,
    bias: model.bias,
    trainingRecords: model.trainingRecords,
    accuracy: model.accuracy,
  });
}

export { processNextJob };
