import { createApp, processNextJob } from "./app.ts";
import { env } from "./config.ts";
import { mkdir } from "node:fs/promises";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

await mkdir(env.storageDir, { recursive: true });

const app = createApp();

if (env.nodeEnv === "production") {
  const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(join(webDist, "index.html"));
    });
  }
}

app.listen(env.port, () => {
  console.log(`ReconcileAI API on :${env.port}`);
});

setInterval(() => {
  void processNextJob();
}, 1500);

setInterval(async () => {
  const { db } = await import("./db/client.ts");
  const { scheduledImports } = await import("./db/schema.ts");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(scheduledImports).where(eq(scheduledImports.active, true));
  const now = Date.now();
  for (const s of rows) {
    const last = s.lastRunAt?.getTime() ?? 0;
    const intervalMs = s.interval === "hourly" ? 3600_000 : s.interval === "weekly" ? 7 * 86400_000 : 86400_000;
    if (now - last < intervalMs) continue;
    if (!s.endpoint) continue;
    await db.update(scheduledImports).set({ lastRunAt: new Date(), lastStatus: "skipped_no_handler" }).where(eq(scheduledImports.id, s.id));
  }
}, 60_000);
