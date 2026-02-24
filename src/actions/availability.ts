"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

export interface ProductAvailability {
  productId: string;
  productName: string;
  categoryName: string;
  categoryCode: string;
  size: string | null;
  totalItems: number;
  availableItems: number;
  assignedItems: number;
  maintenanceItems: number;
  externalItems: number;
}

export interface ItemAvailability {
  itemId: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
}

interface AvailabilityByCategoryParams {
  categoryId?: string;
}

// ---------------------------------------------------------------------------
// getAvailabilityByProduct — aggregate item counts per Product (design/type)
// ---------------------------------------------------------------------------

export async function getAvailabilityByProduct(
  params?: AvailabilityByCategoryParams
): Promise<ActionResult<ProductAvailability[]>> {
  try {
    await requirePermission("items:read");

    // Build a WHERE clause for the category filter
    const categoryFilter = params?.categoryId
      ? `AND i."categoryId" = '${params.categoryId}'`
      : "";

    const rows = await prisma.$queryRawUnsafe<
      {
        productId: string;
        productName: string;
        categoryName: string | null;
        categoryCode: string | null;
        size: string | null;
        totalItems: bigint;
        availableItems: bigint;
        assignedItems: bigint;
        maintenanceItems: bigint;
        externalItems: bigint;
      }[]
    >(
      `
      SELECT
        p."id"           AS "productId",
        p."name"         AS "productName",
        c."name"         AS "categoryName",
        c."code"         AS "categoryCode",
        p."size"         AS "size",
        COUNT(i."id")    AS "totalItems",
        COUNT(i."id") FILTER (WHERE i."status" = 'AVAILABLE')   AS "availableItems",
        COUNT(i."id") FILTER (WHERE i."status" = 'ASSIGNED')    AS "assignedItems",
        COUNT(i."id") FILTER (WHERE i."status" = 'MAINTENANCE') AS "maintenanceItems",
        COUNT(i."id") FILTER (WHERE i."isExternal" = true)       AS "externalItems"
      FROM items i
      JOIN products p ON p."id" = i."productId"
      JOIN categories c ON c."id" = i."categoryId"
      WHERE 1=1 ${categoryFilter}
      GROUP BY p."id", p."name", c."name", c."code", p."size"
      ORDER BY c."code" ASC, p."name" ASC
      `
    );

    const result: ProductAvailability[] = rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      categoryName: row.categoryName ?? "",
      categoryCode: row.categoryCode ?? "",
      size: row.size,
      totalItems: Number(row.totalItems),
      availableItems: Number(row.availableItems),
      assignedItems: Number(row.assignedItems),
      maintenanceItems: Number(row.maintenanceItems),
      externalItems: Number(row.externalItems),
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
// getItemAvailabilityByProduct — list items for a given Product
// ---------------------------------------------------------------------------

export async function getItemAvailabilityByProduct(
  productId: string
): Promise<ActionResult<ItemAvailability[]>> {
  try {
    await requirePermission("items:read");

    const items = await prisma.item.findMany({
      where: { productId },
      select: {
        id: true,
        humanReadableId: true,
        status: true,
        condition: true,
        color: true,
      },
      orderBy: { sequence: "asc" },
    });

    const result: ItemAvailability[] = items.map((i) => ({
      itemId: i.id,
      humanReadableId: i.humanReadableId,
      status: i.status,
      condition: i.condition,
      color: i.color,
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
          : "Failed to fetch item availability",
    };
  }
}
