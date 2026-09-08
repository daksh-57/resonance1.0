import { processNextJob } from "./jobs/processor.ts";
import { env } from "./config.ts";
import { mkdir } from "node:fs/promises";

await mkdir(env.storageDir, { recursive: true });
console.log("ReconcileAI worker polling jobs");
setInterval(() => {
  void processNextJob();
}, 1000);
