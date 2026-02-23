"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  scanLookupSchema,
  type ScanLookupInput,
} from "@/lib/validators/scan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// Serialize Prisma Decimal fields to plain numbers for client components
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePiece(piece: any) {
  return {
    ...piece,
    purchasePrice: piece.purchasePrice ? Number(piece.purchasePrice) : null,
  };
}

// ---------------------------------------------------------------------------
// lookupPieceByBarcode
// ---------------------------------------------------------------------------

export async function lookupPieceByBarcode(
  data: ScanLookupInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("scan:scan");

    const parsed = scanLookupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const normalized = parsed.data.humanReadableId.trim().toUpperCase();

    const piece = await prisma.piece.findUnique({
      where: { humanReadableId: normalized },
      include: {
        item: { select: { id: true, name: true, number: true, size: true } },
        category: { select: { id: true, code: true, name: true } },
        warehouseLocation: { select: { id: true, label: true } },
        containerItems: {
          include: {
            container: {
              include: {
                project: { select: { id: true, name: true } },
              },
            },
            packedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        bookingPieces: {
          include: {
            booking: {
              include: {
                product: { select: { name: true } },
                project: { select: { id: true, name: true, status: true } },
              },
            },
          },
        },
        maintenanceTickets: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            severity: true,
          },
        },
      },
    });

    if (!piece) {
      return { error: `Piece not found: ${normalized}` };
    }

    return { data: serializePiece(piece) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to look up piece",
    };
  }
}

// ---------------------------------------------------------------------------
// lookupPieceById — look up a piece by its UUID (used by QR code scanner)
// ---------------------------------------------------------------------------

export async function lookupPieceById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("scan:scan");

    const piece = await prisma.piece.findUnique({
      where: { id },
      include: {
        item: { select: { id: true, name: true, number: true, size: true } },
        category: { select: { id: true, code: true, name: true } },
        warehouseLocation: { select: { id: true, label: true } },
        containerItems: {
          include: {
            container: {
              include: {
                project: { select: { id: true, name: true } },
              },
            },
            packedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        bookingPieces: {
          include: {
            booking: {
              include: {
                product: { select: { name: true } },
                project: { select: { id: true, name: true, status: true } },
              },
            },
          },
        },
        maintenanceTickets: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            severity: true,
          },
        },
      },
    });

    if (!piece) {
      return { error: "Piece not found" };
    }

    return { data: serializePiece(piece) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to look up piece",
    };
  }
}

// ---------------------------------------------------------------------------
// getContainersForPacking — containers that can accept pieces
// ---------------------------------------------------------------------------

export async function getContainersForPacking(): Promise<
  ActionResult<unknown[]>
> {
  try {
    await requirePermission("containers:read");

    const containers = await prisma.container.findMany({
      where: {
        status: { in: ["EMPTY", "PACKING"] },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        project: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = containers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      projectName: c.project?.name ?? null,
      itemCount: c._count.items,
    }));

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch containers",
    };
  }
}

// Keep old function names as aliases for backward compatibility during migration
export const lookupItemByBarcode = lookupPieceByBarcode;
export const lookupItemById = lookupPieceById;
