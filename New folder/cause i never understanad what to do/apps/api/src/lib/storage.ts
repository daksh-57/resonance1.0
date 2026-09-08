import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "../config.ts";

export async function saveUpload(orgId: string, fileId: string, originalName: string, buf: Buffer): Promise<{ path: string; sha256: string }> {
  const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
  const rel = join(orgId, `${fileId}${ext}`);
  const abs = join(env.storageDir, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { path: abs, sha256 };
}

export function absoluteStorage(path: string): string {
  return path;
}
