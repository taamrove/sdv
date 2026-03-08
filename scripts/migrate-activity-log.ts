/**
 * Migration: ItemHistory → ActivityLog
 * Run BEFORE running prisma db push (while ItemHistory table still exists)
 *
 * Usage: npx tsx scripts/migrate-activity-log.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildHumanReadableChanges(
  prevState: Record<string, unknown> | null,
  nextState: Record<string, unknown> | null,
  locationLabels: Map<string, string>
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  // Handle scalar state (the bug in bookings.ts/check-in.ts)
  const prev: Record<string, unknown> | null =
    prevState && typeof prevState === "object" && !Array.isArray(prevState)
      ? prevState
      : prevState != null
        ? { status: prevState }
        : null;

  const next: Record<string, unknown> | null =
    nextState && typeof nextState === "object" && !Array.isArray(nextState)
      ? nextState
      : nextState != null
        ? { status: nextState }
        : null;

  if (!prev && next) {
    // CREATED: record all non-null fields
    for (const [key, value] of Object.entries(next)) {
      if (value != null && key !== "warehouseLocationId") {
        changes[key] = { from: null, to: value };
      } else if (key === "warehouseLocationId" && value) {
        changes["location"] = {
          from: null,
          to: locationLabels.get(value as string) ?? value,
        };
      }
    }
  } else if (prev && next) {
    // Changed fields only
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const key of allKeys) {
      const p = prev[key] ?? null;
      const n = next[key] ?? null;
      if (JSON.stringify(p) === JSON.stringify(n)) continue;

      if (key === "warehouseLocationId") {
        changes["location"] = {
          from: p ? (locationLabels.get(p as string) ?? p) : null,
          to: n ? (locationLabels.get(n as string) ?? n) : null,
        };
      } else {
        changes[key] = { from: p, to: n };
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

async function main() {
  console.log("Starting ItemHistory → ActivityLog migration...");

  // Batch load lookups
  const [items, locations, users] = await Promise.all([
    prisma.item.findMany({
      select: {
        id: true,
        humanReadableId: true,
        productId: true,
        product: { select: { name: true } },
      },
    }),
    prisma.warehouseLocation.findMany({ select: { id: true, label: true, zone: true } }),
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true } }),
  ]);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const locationLabels = new Map(
    locations.map((l) => [l.id, [l.zone, l.label].filter(Boolean).join(" / ")])
  );
  const userNames = new Map(
    users.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  // Fetch all history entries
  const history = await (prisma as unknown as {
    itemHistory: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        itemId: string;
        action: string;
        performedById: string | null;
        details: unknown;
        previousState: unknown;
        newState: unknown;
        createdAt: Date;
      }>>;
    };
  }).itemHistory.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${history.length} ItemHistory entries to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const entry of history) {
    const item = itemMap.get(entry.itemId);
    if (!item) {
      console.warn(`Item ${entry.itemId} not found, skipping entry ${entry.id}`);
      skipped++;
      continue;
    }

    const prev = entry.previousState as Record<string, unknown> | null;
    const next = entry.newState as Record<string, unknown> | null;
    const changes = buildHumanReadableChanges(prev, next, locationLabels);

    // Build details: preserve existing details + add productId for item links
    let details: Record<string, unknown> = { productId: item.productId };
    if (entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)) {
      details = { ...entry.details as Record<string, unknown>, productId: item.productId };
    }

    const userName = entry.performedById
      ? (userNames.get(entry.performedById) ?? null)
      : null;

    await prisma.activityLog.create({
      data: {
        id: entry.id, // preserve original IDs
        entityType: "Item",
        entityId: entry.itemId,
        entityLabel: `${item.humanReadableId} — ${item.product.name}`,
        action: entry.action,
        userId: entry.performedById,
        userName,
        changes: changes ? (changes as unknown as never) : undefined,
        details: details as never,
        createdAt: entry.createdAt,
      },
    });

    migrated++;
    if (migrated % 50 === 0) console.log(`Migrated ${migrated}/${history.length}`);
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
