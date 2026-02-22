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
            piece: {
              include: {
                item: true,
                category: true,
                warehouseLocation: true,
              },
            },
            packedBy: { select: { id: true, name: true, email: true } },
            verifiedBy: { select: { id: true, name: true, email: true } },
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
// packItem — add a piece to a container
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

      // Verify piece exists
      const piece = await tx.piece.findUnique({
        where: { id: parsed.data.pieceId },
        include: { item: true },
      });
      if (!piece) {
        throw new Error("Piece not found");
      }

      // Verify piece is not already in another container
      const existingPack = await tx.containerItem.findFirst({
        where: { pieceId: parsed.data.pieceId },
        include: { container: { select: { name: true } } },
      });
      if (existingPack) {
        throw new Error(
          `Piece is already packed in "${existingPack.container.name}"`
        );
      }

      // Verify piece status allows packing
      if (!["AVAILABLE", "ASSIGNED"].includes(piece.status)) {
        throw new Error(
          `Cannot pack piece with status "${piece.status}". Piece must be AVAILABLE or ASSIGNED.`
        );
      }

      // Create ContainerItem
      const containerItem = await tx.containerItem.create({
        data: {
          containerId: parsed.data.containerId,
          pieceId: parsed.data.pieceId,
          packedById: user?.id ?? null,
        },
        include: {
          piece: { include: { item: true, category: true } },
          packedBy: { select: { id: true, name: true } },
        },
      });

      // Update piece status to PACKED
      await tx.piece.update({
        where: { id: parsed.data.pieceId },
        data: { status: "PACKED" },
      });

      // If container was EMPTY, transition to PACKING
      if (container.status === "EMPTY") {
        await tx.container.update({
          where: { id: parsed.data.containerId },
          data: { status: "PACKING" },
        });
      }

      // Record history
      await tx.pieceHistory.create({
        data: {
          pieceId: parsed.data.pieceId,
          action: "PACKED",
          performedById: user?.id ?? null,
          previousState: { status: piece.status },
          newState: {
            status: "PACKED",
            containerId: parsed.data.containerId,
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
        error instanceof Error ? error.message : "Failed to pack piece",
    };
  }
}

// ---------------------------------------------------------------------------
// unpackItem — remove a piece from a container
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
          piece: true,
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

      // Check if piece has booking assignments -> set ASSIGNED, otherwise AVAILABLE
      const bookingAssignment = await tx.bookingPiece.findFirst({
        where: { pieceId: containerItem.pieceId },
      });
      const newStatus = bookingAssignment ? "ASSIGNED" : "AVAILABLE";

      await tx.piece.update({
        where: { id: containerItem.pieceId },
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

      // Record history
      await tx.pieceHistory.create({
        data: {
          pieceId: containerItem.pieceId,
          action: "UNPACKED",
          performedById: user?.id ?? null,
          previousState: {
            status: "PACKED",
            containerId: containerItem.containerId,
            containerName: containerItem.container.name,
          },
          newState: { status: newStatus },
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
        error instanceof Error ? error.message : "Failed to unpack piece",
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

    const piece = await prisma.piece.findUnique({
      where: { humanReadableId: normalized },
    });

    if (!piece) {
      return { error: `Piece not found: ${normalized}` };
    }

    return packItem({ containerId, pieceId: piece.id });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to pack piece",
    };
  }
}

// ---------------------------------------------------------------------------
// getStatusTransitions — returns valid next statuses for a container
// ---------------------------------------------------------------------------

export async function getStatusTransitions(currentStatus: string): Promise<string[]> {
  return STATUS_TRANSITIONS[currentStatus] ?? [];
}
