"use server";

import { Prisma } from "@prisma/client";
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
// checkInPiece
// ---------------------------------------------------------------------------

export async function checkInPiece(
  data: CheckInInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:create");

    const parsed = checkInSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const piece = await prisma.piece.findUnique({
      where: { id: parsed.data.pieceId },
      include: { item: true, category: true },
    });

    if (!piece) {
      return { error: "Piece not found" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const previousStatus = piece.status;

    // -----------------------------------------------------------------------
    // Action: Check in to inventory
    // -----------------------------------------------------------------------
    if (parsed.data.action === "INVENTORY") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.piece.update({
          where: { id: parsed.data.pieceId },
          data: {
            status: "AVAILABLE",
            warehouseLocationId: parsed.data.warehouseLocationId ?? undefined,
          },
          include: {
            item: true,
            category: true,
            warehouseLocation: true,
          },
        });

        await tx.pieceHistory.create({
          data: {
            pieceId: parsed.data.pieceId,
            action: "CHECKED_IN_TO_INVENTORY",
            performedById: user.id,
            previousState: previousStatus as unknown as Prisma.InputJsonValue,
            newState: "AVAILABLE" as unknown as Prisma.InputJsonValue,
            details: {
              warehouseLocationId: parsed.data.warehouseLocationId ?? null,
              notes: parsed.data.notes ?? null,
            } as Prisma.InputJsonValue,
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

      // MINOR severity: piece stays available (still usable)
      // MODERATE or UNUSABLE: piece goes to MAINTENANCE status
      const newPieceStatus =
        severity === "MINOR" ? previousStatus : "MAINTENANCE";

      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.maintenanceTicket.create({
          data: {
            title: parsed.data.maintenanceTitle!,
            description: parsed.data.notes ?? null,
            pieceId: parsed.data.pieceId,
            severity: severity,
            status: "REPORTED",
            reportedById: user.id,
          },
          include: {
            piece: { include: { item: true, category: true } },
            reportedBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { photos: true, comments: true } },
          },
        });

        if (newPieceStatus !== previousStatus) {
          await tx.piece.update({
            where: { id: parsed.data.pieceId },
            data: { status: newPieceStatus },
          });
        }

        await tx.pieceHistory.create({
          data: {
            pieceId: parsed.data.pieceId,
            action: "SENT_TO_MAINTENANCE",
            performedById: user.id,
            previousState: previousStatus as unknown as Prisma.InputJsonValue,
            newState: newPieceStatus as unknown as Prisma.InputJsonValue,
            details: {
              ticketId: ticket.id,
              title: parsed.data.maintenanceTitle,
              severity: severity,
              notes: parsed.data.notes ?? null,
            } as Prisma.InputJsonValue,
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
    return { error: error instanceof Error ? error.message : "Failed to check in piece" };
  }
}

// Keep old function name as alias for backward compatibility during migration
export const checkInItem = checkInPiece;
