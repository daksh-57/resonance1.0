import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config.ts";
import postgres from "postgres";

async function main() {
  const sql = postgres(env.databaseUrl, { max: 1 });
  const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  for (const file of files) {
    const done = await sql<{ filename: string }[]>`SELECT filename FROM schema_migrations WHERE filename = ${file}`;
    if (done.length) {
      console.log("skip", file);
      continue;
    }
    const body = await readFile(join(dir, file), "utf8");
    await sql.unsafe(body);
    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    console.log("applied", file);
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
