import { db } from "../db/client.ts";
import { auditEvents, notifications } from "../db/schema.ts";
import type { AuditAction } from "@reconcile/shared";

export async function audit(input: {
  organizationId: string;
  actorUserId?: string | null;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    oldValue: input.oldValue as object | undefined,
    newValue: input.newValue as object | undefined,
    reason: input.reason,
    sourceId: input.sourceId,
    metadata: input.metadata ?? {},
  });
}

export async function notify(input: {
  organizationId: string;
  userId?: string | null;
  type: string;
  title: string;
  body?: string;
}) {
  await db.insert(notifications).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
  });
}
