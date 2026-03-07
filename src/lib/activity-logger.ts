import { getFullName } from "@/lib/format-name";

// ---------------------------------------------------------------------------
// Models logged automatically via Prisma $extends
// Item is EXCLUDED — items use manual tx.activityLog.create() for atomicity
// ---------------------------------------------------------------------------

export type LoggableModel =
  | "Performer"
  | "Contact"
  | "Project"
  | "Product"
  | "Category"
  | "WarehouseLocation"
  | "Container";

export const LOGGABLE_MODELS = new Set<string>([
  "Performer",
  "Contact",
  "Project",
  "Product",
  "Category",
  "WarehouseLocation",
  "Container",
]);

// ---------------------------------------------------------------------------
// Fields excluded from diff computation
// ---------------------------------------------------------------------------

const ALWAYS_EXCLUDE = new Set(["id", "createdAt", "updatedAt"]);

function shouldExclude(field: string): boolean {
  if (ALWAYS_EXCLUDE.has(field)) return true;
  if (field.endsWith("Id")) return true; // FK noise
  return false;
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

export type ChangeMap = Record<string, { from: unknown; to: unknown }>;

export function computeDiff(
  _model: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): ChangeMap {
  const changes: ChangeMap = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (shouldExclude(key)) continue;
    const prev = before[key] ?? null;
    const next = after[key] ?? null;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[key] = { from: prev, to: next };
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Entity label resolution
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any;

export async function resolveEntityLabel(
  prisma: AnyPrismaClient,
  model: string,
  record: Record<string, unknown>
): Promise<string | null> {
  try {
    if (model === "Contact") {
      return getFullName(record as { firstName?: string; lastName?: string });
    }
    if (model === "Performer") {
      const contactId = record.contactId as string | undefined;
      if (contactId) {
        const contact = await prisma.contact.findUnique({
          where: { id: contactId },
          select: { firstName: true, lastName: true },
        });
        if (contact) return getFullName(contact);
      }
      return null;
    }
    if (typeof record.name === "string") return record.name;
    if (typeof record.label === "string") return record.label;
  } catch {
    // ignore label resolution errors — non-critical
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

export interface LogActivityParams {
  prisma: AnyPrismaClient;
  model: string;
  entityId: string;
  action: string;
  userId?: string | null;
  userName?: string | null;
  changes?: ChangeMap;
  entityLabel?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const { prisma, model, entityId, action, userId, userName, changes, entityLabel, details } =
    params;

  // Skip empty updates (no user-visible changes)
  if (action === "UPDATED" && changes && Object.keys(changes).length === 0) {
    return;
  }

  try {
    await prisma.activityLog.create({
      data: {
        entityType: model,
        entityId,
        entityLabel: entityLabel ?? null,
        action,
        userId: userId ?? null,
        userName: userName ?? null,
        changes:
          changes && Object.keys(changes).length > 0
            ? (changes as Record<string, unknown>)
            : undefined,
        details: details ?? undefined,
      },
    });
  } catch (err) {
    // Log errors should not crash the main operation
    console.error("[activity-logger] Failed to write ActivityLog:", err);
  }
}
