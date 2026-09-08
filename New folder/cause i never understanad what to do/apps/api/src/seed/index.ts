import bcrypt from "bcryptjs";
import { defaultOrgSettings } from "@reconcile/shared";
import { db } from "../db/client.ts";
import { organizations, users } from "../db/schema.ts";
import { eq } from "drizzle-orm";

async function seed() {
  const email = "demo@reconcile.ai";
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!existing.length) {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Acme Corp", slug: "acme-demo", settings: defaultOrgSettings() })
      .returning();
    await db.insert(users).values({
      organizationId: org!.id,
      email,
      passwordHash: await bcrypt.hash("DemoPass123!", 12),
      name: "Demo Admin",
      role: "admin",
    });
    console.log("Seeded demo user demo@reconcile.ai / DemoPass123!");
  } else {
    console.log("Demo user already exists");
  }
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
