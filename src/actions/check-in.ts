"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import {
  checkInSchema,
  type CheckInInput,
} from "@/lib/validators/check-in";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// checkInItem
// ---------------------------------------------------------------------------

export async function checkInItem(
  data: CheckInInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:create");

    const parsed = checkInSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const item = await prisma.item.findUnique({
      where: { id: parsed.data.itemId },
      include: { product: { select: { name: true } }, category: true },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const userName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const previousStatus = item.status;

    // -----------------------------------------------------------------------
    // Action: Check in to inventory
    // -----------------------------------------------------------------------
    if (parsed.data.action === "INVENTORY") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.item.update({
          where: { id: parsed.data.itemId },
          data: {
            status: "AVAILABLE",
            warehouseLocationId: parsed.data.warehouseLocationId ?? undefined,
          },
          include: {
            product: true,
            category: true,
            warehouseLocation: true,
          },
        });

        await tx.activityLog.create({
          data: {
            entityType: "Item",
            entityId: parsed.data.itemId,
            entityLabel: `${item.humanReadableId} — ${item.product.name}`,
            action: "CHECKED_IN_TO_INVENTORY",
            userId: user.id,
            userName,
            changes: { status: { from: previousStatus, to: "AVAILABLE" } },
            details: { productId: item.productId },
          },
        });

        return updated;
      });

      return { data: result };
    }

    // -----------------------------------------------------------------------
    // Action: Send to maintenance
    // -----------------------------------------------------------------------
    if (parsed.data.action === "MAINTENANCE") {
      if (!parsed.data.maintenanceTitle) {
        return { error: "Maintenance title is required" };
      }

      const severity = parsed.data.maintenanceSeverity ?? null;

      // MINOR severity: item stays available (still usable)
      // MODERATE or UNUSABLE: item goes to MAINTENANCE status
      const newItemStatus =
        severity === "MINOR" ? previousStatus : "MAINTENANCE";

      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.maintenanceTicket.create({
          data: {
            title: parsed.data.maintenanceTitle!,
            description: parsed.data.notes ?? null,
            itemId: parsed.data.itemId,
            severity: severity,
            status: "REPORTED",
            reportedById: user.id,
          },
          include: {
            item: { include: { product: true, category: true } },
            reportedBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { photos: true, comments: true } },
          },
        });

        if (newItemStatus !== previousStatus) {
          await tx.item.update({
            where: { id: parsed.data.itemId },
            data: { status: newItemStatus },
          });
        }

        await tx.activityLog.create({
          data: {
            entityType: "Item",
            entityId: parsed.data.itemId,
            entityLabel: `${item.humanReadableId} — ${item.product.name}`,
            action: "SENT_TO_MAINTENANCE",
            userId: user.id,
            userName,
            changes: { status: { from: previousStatus, to: newItemStatus } },
            details: { productId: item.productId },
          },
        });

        return ticket;
      });

      return { data: result };
    }

    return { error: "Invalid action" };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to check in item" };
  }
}
