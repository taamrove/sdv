"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import { buildHumanReadableId } from "@/lib/human-id";
import {
  createPieceSchema,
  updatePieceSchema,
  type CreatePieceInput,
  type UpdatePieceInput,
} from "@/lib/validators/piece";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PieceListParams {
  categoryId?: string;
  itemId?: string;
  status?: string;
  search?: string;
  warehouseLocationId?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getPieces
// ---------------------------------------------------------------------------

export async function getPieces(
  params?: PieceListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("pieces:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.itemId) {
      where.itemId = params.itemId;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.warehouseLocationId) {
      where.warehouseLocationId = params.warehouseLocationId;
    }

    if (params?.search) {
      where.OR = [
        { humanReadableId: { contains: params.search, mode: "insensitive" } },
        {
          item: {
            name: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [pieces, total] = await Promise.all([
      prisma.piece.findMany({
        where,
        include: {
          item: true,
          category: true,
          warehouseLocation: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.piece.count({ where }),
    ]);

    return {
      data: pieces,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch pieces" };
  }
}

// ---------------------------------------------------------------------------
// getPieceById
// ---------------------------------------------------------------------------

export async function getPieceById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("pieces:read");

    const piece = await prisma.piece.findUnique({
      where: { id },
      include: {
        item: true,
        category: true,
        warehouseLocation: true,
      },
    });

    if (!piece) {
      return { error: "Piece not found" };
    }

    return { data: piece };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch piece" };
  }
}

// ---------------------------------------------------------------------------
// createPiece
// ---------------------------------------------------------------------------

export async function createPiece(
  data: CreatePieceInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("pieces:create");

    const parsed = createPieceSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const item = await prisma.item.findUnique({
      where: { id: parsed.data.itemId },
      include: { category: true },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    const user = await getCurrentUser();

    const piece = await prisma.$transaction(async (tx) => {
      // Get next sequence within the transaction for safety
      const lastPiece = await tx.piece.findFirst({
        where: { itemId: item.id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const sequence = (lastPiece?.sequence ?? 0) + 1;

      const humanReadableId = buildHumanReadableId(
        item.category.code,
        item.number,
        sequence
      );

      const created = await tx.piece.create({
        data: {
          categoryId: item.categoryId,
          itemId: item.id,
          sequence,
          humanReadableId,
          sizes: parsed.data.sizes ? (parsed.data.sizes as Record<string, string>) : undefined,
          color: parsed.data.color,
          purchaseDate: parsed.data.purchaseDate
            ? new Date(parsed.data.purchaseDate)
            : undefined,
          purchasePrice: parsed.data.purchasePrice,
          notes: parsed.data.notes,
          warehouseLocationId: parsed.data.warehouseLocationId ?? undefined,
          imageUrl: parsed.data.imageUrl ?? undefined,
          condition: parsed.data.condition ?? undefined,
          isExternal: parsed.data.isExternal ?? false,
        },
        include: {
          item: true,
          category: true,
          warehouseLocation: true,
        },
      });

      // Record history
      await tx.pieceHistory.create({
        data: {
          pieceId: created.id,
          action: "CREATED",
          performedById: user?.id ?? null,
          newState: {
            status: created.status,
            condition: created.condition,
            warehouseLocationId: created.warehouseLocationId,
          },
        },
      });

      return created;
    });

    return { data: piece };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create piece" };
  }
}

// ---------------------------------------------------------------------------
// updatePiece
// ---------------------------------------------------------------------------

export async function updatePiece(
  id: string,
  data: UpdatePieceInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("pieces:update");

    const parsed = updatePieceSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.piece.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Piece not found" };
    }

    const user = await getCurrentUser();

    // Determine the history action based on what changed
    let historyAction: string = "UPDATED";
    if (parsed.data.status && parsed.data.status !== existing.status) {
      historyAction = "STATUS_CHANGED";
    } else if (
      parsed.data.condition &&
      parsed.data.condition !== existing.condition
    ) {
      historyAction = "CONDITION_CHANGED";
    } else if (
      parsed.data.warehouseLocationId !== undefined &&
      parsed.data.warehouseLocationId !== existing.warehouseLocationId
    ) {
      historyAction = "LOCATION_CHANGED";
    }

    const piece = await prisma.$transaction(async (tx) => {
      const { sizes, ...rest } = parsed.data;
      const updateData = {
        ...rest,
        ...(sizes ? { sizes: sizes as Record<string, string> } : {}),
      };
      const updated = await tx.piece.update({
        where: { id },
        data: updateData as Parameters<typeof tx.piece.update>[0]["data"],
        include: {
          item: true,
          category: true,
          warehouseLocation: true,
        },
      });

      await tx.pieceHistory.create({
        data: {
          pieceId: id,
          action: historyAction as never,
          performedById: user?.id ?? null,
          previousState: {
            status: existing.status,
            condition: existing.condition,
            warehouseLocationId: existing.warehouseLocationId,
          },
          newState: {
            status: updated.status,
            condition: updated.condition,
            warehouseLocationId: updated.warehouseLocationId,
          },
        },
      });

      return updated;
    });

    return { data: piece };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update piece" };
  }
}

// ---------------------------------------------------------------------------
// deletePiece (soft delete -> status = RETIRED)
// ---------------------------------------------------------------------------

export async function deletePiece(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("pieces:delete");

    const existing = await prisma.piece.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Piece not found" };
    }

    const user = await getCurrentUser();

    const piece = await prisma.$transaction(async (tx) => {
      const updated = await tx.piece.update({
        where: { id },
        data: { status: "RETIRED" },
        include: {
          item: true,
          category: true,
          warehouseLocation: true,
        },
      });

      await tx.pieceHistory.create({
        data: {
          pieceId: id,
          action: "RETIRED",
          performedById: user?.id ?? null,
          previousState: { status: existing.status },
          newState: { status: "RETIRED" },
        },
      });

      return updated;
    });

    return { data: piece };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete piece" };
  }
}

// ---------------------------------------------------------------------------
// getPieceHistory
// ---------------------------------------------------------------------------

export async function getPieceHistory(
  pieceId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("pieces:read");

    const piece = await prisma.piece.findUnique({ where: { id: pieceId } });
    if (!piece) {
      return { error: "Piece not found" };
    }

    const history = await prisma.pieceHistory.findMany({
      where: { pieceId },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: history };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch piece history" };
  }
}
