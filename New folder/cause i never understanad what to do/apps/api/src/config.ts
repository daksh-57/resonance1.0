import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://reconcile:reconcile@localhost:5432/reconcile",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-change-me",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").trim() || "http://localhost:5173",
  storageDir: process.env.STORAGE_DIR ?? resolve(root, "storage"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 25),
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE ?? "+91",
  llmProvider: process.env.LLM_PROVIDER ?? "none",
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
};

export const isProd = env.nodeEnv === "production";
