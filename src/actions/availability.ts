"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

export interface ItemAvailability {
  itemId: string;
  itemName: string;
  categoryName: string;
  categoryCode: string;
  size: string | null;
  totalPieces: number;
  availablePieces: number;
  assignedPieces: number;
  maintenancePieces: number;
  externalPieces: number;
}

export interface PieceAvailability {
  pieceId: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
}

interface AvailabilityByCategoryParams {
  categoryId?: string;
}

// ---------------------------------------------------------------------------
// getAvailabilityByItem — aggregate piece counts per Item (design/type)
// ---------------------------------------------------------------------------

export async function getAvailabilityByItem(
  params?: AvailabilityByCategoryParams
): Promise<ActionResult<ItemAvailability[]>> {
  try {
    await requirePermission("pieces:read");

    // Build a WHERE clause for the category filter
    const categoryFilter = params?.categoryId
      ? `AND p."categoryId" = '${params.categoryId}'`
      : "";

    const rows = await prisma.$queryRawUnsafe<
      {
        itemId: string;
        itemName: string;
        categoryName: string | null;
        categoryCode: string | null;
        size: string | null;
        totalPieces: bigint;
        availablePieces: bigint;
        assignedPieces: bigint;
        maintenancePieces: bigint;
        externalPieces: bigint;
      }[]
    >(
      `
      SELECT
        i."id"           AS "itemId",
        i."name"         AS "itemName",
        c."name"         AS "categoryName",
        c."code"         AS "categoryCode",
        i."size"         AS "size",
        COUNT(p."id")    AS "totalPieces",
        COUNT(p."id") FILTER (WHERE p."status" = 'AVAILABLE')   AS "availablePieces",
        COUNT(p."id") FILTER (WHERE p."status" = 'ASSIGNED')    AS "assignedPieces",
        COUNT(p."id") FILTER (WHERE p."status" = 'MAINTENANCE') AS "maintenancePieces",
        COUNT(p."id") FILTER (WHERE p."isExternal" = true)       AS "externalPieces"
      FROM pieces p
      JOIN items i ON i."id" = p."itemId"
      JOIN categories c ON c."id" = p."categoryId"
      WHERE 1=1 ${categoryFilter}
      GROUP BY i."id", i."name", c."name", c."code", i."size"
      ORDER BY c."code" ASC, i."name" ASC
      `
    );

    const result: ItemAvailability[] = rows.map((row) => ({
      itemId: row.itemId,
      itemName: row.itemName,
      categoryName: row.categoryName ?? "",
      categoryCode: row.categoryCode ?? "",
      size: row.size,
      totalPieces: Number(row.totalPieces),
      availablePieces: Number(row.availablePieces),
      assignedPieces: Number(row.assignedPieces),
      maintenancePieces: Number(row.maintenancePieces),
      externalPieces: Number(row.externalPieces),
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
          : "Failed to fetch availability data",
    };
  }
}

// ---------------------------------------------------------------------------
// getAvailabilityByPiece — list pieces for a given Item
// ---------------------------------------------------------------------------

export async function getAvailabilityByPiece(
  itemId: string
): Promise<ActionResult<PieceAvailability[]>> {
  try {
    await requirePermission("pieces:read");

    const pieces = await prisma.piece.findMany({
      where: { itemId },
      select: {
        id: true,
        humanReadableId: true,
        status: true,
        condition: true,
        color: true,
      },
      orderBy: { sequence: "asc" },
    });

    const result: PieceAvailability[] = pieces.map((p) => ({
      pieceId: p.id,
      humanReadableId: p.humanReadableId,
      status: p.status,
      condition: p.condition,
      color: p.color,
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
          : "Failed to fetch piece availability",
    };
  }
}

// Keep old function names as aliases for backward compatibility during migration
export const getAvailabilityByGroup = getAvailabilityByItem;
export const getAvailabilityByProduct = getAvailabilityByPiece;
