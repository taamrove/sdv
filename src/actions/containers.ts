"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import {
  createContainerSchema,
  updateContainerSchema,
  packItemSchema,
  type CreateContainerInput,
  type UpdateContainerInput,
  type PackItemInput,
} from "@/lib/validators/container";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ContainerListParams {
  status?: string;
  type?: string;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// Status transition map
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<string, string[]> = {
  EMPTY: ["PACKING"],
  PACKING: ["PACKED", "EMPTY"],
  PACKED: ["IN_TRANSIT", "PACKING"],
  IN_TRANSIT: ["AT_VENUE", "PACKED"],
  AT_VENUE: ["RETURNED", "IN_TRANSIT"],
  RETURNED: ["UNPACKED", "AT_VENUE"],
  UNPACKED: ["EMPTY"],
};

// ---------------------------------------------------------------------------
// getContainers
// ---------------------------------------------------------------------------

export async function getContainers(
  params?: ContainerListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("containers:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.projectId) {
      where.projectId = params.projectId;
    }

    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [containers, total] = await Promise.all([
      prisma.container.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.container.count({ where }),
    ]);

    return {
      data: containers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

// ---------------------------------------------------------------------------
// getContainerById
// ---------------------------------------------------------------------------

export async function getContainerById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:read");

    const container = await prisma.container.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        items: {
          include: {
            item: {
              include: {
                product: true,
                category: true,
                warehouseLocation: true,
              },
            },
            packedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            verifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { packedAt: "desc" },
        },
      },
    });

    if (!container) {
      return { error: "Container not found" };
    }

    return { data: container };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch container",
    };
  }
}

// ---------------------------------------------------------------------------
// createContainer
// ---------------------------------------------------------------------------

export async function createContainer(
  data: CreateContainerInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:create");

    const parsed = createContainerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const container = await prisma.container.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description,
        projectId: parsed.data.projectId ?? undefined,
        notes: parsed.data.notes,
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    return { data: container };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create container",
    };
  }
}

// ---------------------------------------------------------------------------
// updateContainer
// ---------------------------------------------------------------------------

export async function updateContainer(
  id: string,
  data: UpdateContainerInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:update");

    const parsed = updateContainerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.container.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Container not found" };
    }

    // Validate status transition
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return {
          error: `Cannot transition from ${existing.status} to ${parsed.data.status}`,
        };
      }
    }

    const container = await prisma.container.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description,
        }),
        ...(parsed.data.projectId !== undefined && {
          projectId: parsed.data.projectId,
        }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    return { data: container };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update container",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteContainer
// ---------------------------------------------------------------------------

export async function deleteContainer(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:delete");

    const existing = await prisma.container.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) {
      return { error: "Container not found" };
    }

    if (existing._count.items > 0) {
      return {
        error: "Cannot delete container with packed items. Unpack all items first.",
      };
    }

    await prisma.container.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete container",
    };
  }
}

// ---------------------------------------------------------------------------
// packItem — add an item to a container
// ---------------------------------------------------------------------------

export async function packItem(
  data: PackItemInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:update");

    const parsed = packItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const user = await getCurrentUser();

    const result = await prisma.$transaction(async (tx) => {
      // Verify container exists
      const container = await tx.container.findUnique({
        where: { id: parsed.data.containerId },
      });
      if (!container) {
        throw new Error("Container not found");
      }

      // Verify item exists
      const item = await tx.item.findUnique({
        where: { id: parsed.data.itemId },
        include: { product: { select: { name: true } } },
      });
      if (!item) {
        throw new Error("Item not found");
      }

      // Verify item is not already in another container
      const existingPack = await tx.containerItem.findFirst({
        where: { itemId: parsed.data.itemId },
        include: { container: { select: { name: true } } },
      });
      if (existingPack) {
        throw new Error(
          `Item is already packed in "${existingPack.container.name}"`
        );
      }

      // Verify item status allows packing
      if (!["AVAILABLE", "ASSIGNED"].includes(item.status)) {
        throw new Error(
          `Cannot pack item with status "${item.status}". Item must be AVAILABLE or ASSIGNED.`
        );
      }

      // Create ContainerItem
      const containerItem = await tx.containerItem.create({
        data: {
          containerId: parsed.data.containerId,
          itemId: parsed.data.itemId,
          packedById: user?.id ?? null,
        },
        include: {
          item: { include: { product: true, category: true } },
          packedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update item status to PACKED
      await tx.item.update({
        where: { id: parsed.data.itemId },
        data: { status: "PACKED" },
      });

      // If container was EMPTY, transition to PACKING
      if (container.status === "EMPTY") {
        await tx.container.update({
          where: { id: parsed.data.containerId },
          data: { status: "PACKING" },
        });
      }

      // Record activity log
      await tx.activityLog.create({
        data: {
          entityType: "Item",
          entityId: item.id,
          entityLabel: `${item.humanReadableId} — ${item.product?.name ?? ""}`,
          action: "PACKED",
          userId: user?.id ?? null,
          userName: user
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : null,
          changes: { status: { from: item.status, to: "PACKED" } },
          details: {
            productId: item.productId,
            containerId: container.id,
            containerName: container.name,
          },
        },
      });

      return containerItem;
    });

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to pack item",
    };
  }
}

// ---------------------------------------------------------------------------
// unpackItem — remove an item from a container
// ---------------------------------------------------------------------------

export async function unpackItem(
  containerItemId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:update");

    const user = await getCurrentUser();

    const result = await prisma.$transaction(async (tx) => {
      // Find the container item
      const containerItem = await tx.containerItem.findUnique({
        where: { id: containerItemId },
        include: {
          item: { include: { product: { select: { name: true } } } },
          container: true,
        },
      });
      if (!containerItem) {
        throw new Error("Container item not found");
      }

      // Delete the ContainerItem
      await tx.containerItem.delete({
        where: { id: containerItemId },
      });

      // Check if item has booking assignments -> set ASSIGNED, otherwise AVAILABLE
      const bookingAssignment = await tx.bookingItem.findFirst({
        where: { itemId: containerItem.itemId },
      });
      const newStatus = bookingAssignment ? "ASSIGNED" : "AVAILABLE";

      await tx.item.update({
        where: { id: containerItem.itemId },
        data: { status: newStatus },
      });

      // Check if container is now empty
      const remainingItems = await tx.containerItem.count({
        where: { containerId: containerItem.containerId },
      });
      if (remainingItems === 0 && containerItem.container.status === "PACKING") {
        await tx.container.update({
          where: { id: containerItem.containerId },
          data: { status: "EMPTY" },
        });
      }

      // Record activity log
      await tx.activityLog.create({
        data: {
          entityType: "Item",
          entityId: containerItem.item.id,
          entityLabel: `${containerItem.item.humanReadableId} — ${containerItem.item.product?.name ?? ""}`,
          action: "UNPACKED",
          userId: user?.id ?? null,
          userName: user
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : null,
          changes: { status: { from: "PACKED", to: newStatus } },
          details: {
            productId: containerItem.item.productId,
            containerId: containerItem.containerId,
            containerName: containerItem.container?.name,
          },
        },
      });

      return { success: true, newStatus };
    });

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to unpack item",
    };
  }
}

// ---------------------------------------------------------------------------
// packItemByHumanId — convenience for scanner workflow
// ---------------------------------------------------------------------------

export async function packItemByHumanId(
  containerId: string,
  humanReadableId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("containers:update");

    const normalized = humanReadableId.trim().toUpperCase();

    const item = await prisma.item.findUnique({
      where: { humanReadableId: normalized },
    });

    if (!item) {
      return { error: `Item not found: ${normalized}` };
    }

    return packItem({ containerId, itemId: item.id });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to pack item",
    };
  }
}

// ---------------------------------------------------------------------------
// getStatusTransitions — returns valid next statuses for a container
// ---------------------------------------------------------------------------

export async function getStatusTransitions(currentStatus: string): Promise<string[]> {
  return STATUS_TRANSITIONS[currentStatus] ?? [];
}
