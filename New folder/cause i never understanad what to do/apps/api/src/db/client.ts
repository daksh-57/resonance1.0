import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config.ts";
import * as schema from "./schema.ts";

const queryClient = postgres(env.databaseUrl, { max: 10 });
export const db = drizzle(queryClient, { schema });
export const sql = queryClient;
