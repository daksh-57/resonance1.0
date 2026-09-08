import type { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.ts";
import { apiKeys, sessions, users } from "../db/schema.ts";
import { sha256 } from "../lib/crypto.ts";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  name: string;
  via: "session" | "api_key";
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer rai_")) {
      const raw = header.slice("Bearer ".length);
      const hash = sha256(raw);
      const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
      if (key && !key.revokedAt) {
        const userId = key.createdBy ?? key.organizationId;
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));
        if (user) {
          req.auth = {
            userId: user.id,
            organizationId: key.organizationId,
            role: user.role,
            email: user.email,
            name: user.name,
            via: "api_key",
          };
        }
      }
      next();
      return;
    }
    const sid = req.cookies?.sid as string | undefined;
    if (!sid) {
      next();
      return;
    }
    const [sess] = await db.select().from(sessions).where(eq(sessions.id, sid)).limit(1);
    if (!sess || sess.expiresAt < new Date()) {
      next();
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
    if (user) {
      req.auth = {
        userId: user.id,
        organizationId: sess.organizationId,
        role: user.role,
        email: user.email,
        name: user.name,
        via: "session",
      };
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: "Authentication required" });
  next();
}

export function orgScope<T extends { organizationId: string }>(row: T | undefined, orgId: string): T | undefined {
  if (!row || row.organizationId !== orgId) return undefined;
  return row;
}

export { and, eq };
