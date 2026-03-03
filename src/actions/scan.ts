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
function serializeItem(item: any) {
  return {
    ...item,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
  };
}

// ---------------------------------------------------------------------------
// lookupItemByBarcode
// ---------------------------------------------------------------------------

export async function lookupItemByBarcode(
  data: ScanLookupInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("scan:scan");

    const parsed = scanLookupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const normalized = parsed.data.humanReadableId.trim().toUpperCase();

    const item = await prisma.item.findUnique({
      where: { humanReadableId: normalized },
      include: {
        product: { select: { id: true, name: true, number: true } },
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
        bookingItems: {
          include: {
            booking: {
              include: {
                kit: { select: { name: true } },
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

    if (!item) {
      return { error: `Item not found: ${normalized}` };
    }

    return { data: serializeItem(item) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to look up item",
    };
  }
}

// ---------------------------------------------------------------------------
// lookupItemById — look up an item by its UUID (used by QR code scanner)
// ---------------------------------------------------------------------------

export async function lookupItemById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("scan:scan");

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, number: true } },
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
        bookingItems: {
          include: {
            booking: {
              include: {
                kit: { select: { name: true } },
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

    if (!item) {
      return { error: "Item not found" };
    }

    return { data: serializeItem(item) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to look up item",
    };
  }
}

// ---------------------------------------------------------------------------
// getContainersForPacking — containers that can accept items
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
