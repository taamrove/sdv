"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  action: string;
  userId: string | null;
  userName: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  details: Record<string, unknown> | null;
  createdAt: string; // ISO string — safe for client components
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> = { data: T[]; pagination: Pagination } | { error: string };

function serialize(
  entries: {
    id: string;
    entityType: string;
    entityId: string;
    entityLabel: string | null;
    action: string;
    userId: string | null;
    userName: string | null;
    changes: unknown;
    details: unknown;
    createdAt: Date;
  }[]
): ActivityEntry[] {
  return entries.map((e) => ({
    id: e.id,
    entityType: e.entityType,
    entityId: e.entityId,
    entityLabel: e.entityLabel,
    action: e.action,
    userId: e.userId,
    userName: e.userName,
    changes:
      (e.changes as Record<string, { from: unknown; to: unknown }> | null) ?? null,
    details: (e.details as Record<string, unknown> | null) ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// getEntityActivity — used by detail pages
// ---------------------------------------------------------------------------

export async function getEntityActivity(
  entities: Array<{ entityType: string; entityId: string }>,
  limit = 20
): Promise<ActionResult<ActivityEntry[]>> {
  try {
    await requirePermission("items:read");

    if (entities.length === 0) return { data: [] };

    const entries = await prisma.activityLog.findMany({
      where: { OR: entities.filter((e) => e.entityId) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { data: serialize(entries) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to fetch activity" };
  }
}

// ---------------------------------------------------------------------------
// getItemActivity — used by product detail page (query by entityIds list)
// ---------------------------------------------------------------------------

export async function getItemActivity(
  itemIds: string[],
  limit = 20
): Promise<ActionResult<ActivityEntry[]>> {
  try {
    await requirePermission("items:read");

    if (itemIds.length === 0) return { data: [] };

    const entries = await prisma.activityLog.findMany({
      where: { entityType: "Item", entityId: { in: itemIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { data: serialize(entries) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to fetch item activity" };
  }
}

// ---------------------------------------------------------------------------
// getActivityFeed — paginated global feed for /activity page
// ---------------------------------------------------------------------------

export async function getActivityFeed(
  page = 1,
  limit = 30
): Promise<PaginatedResult<ActivityEntry>> {
  try {
    await requirePermission("items:read");

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count(),
    ]);

    return {
      data: serialize(entries),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to fetch activity feed" };
  }
}
