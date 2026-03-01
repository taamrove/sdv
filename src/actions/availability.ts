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
  /** Items available for a specific date range (= availableItems when no dates set) */
  effectiveAvailableItems: number;
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
  /** ISO date string e.g. "2025-12-01" */
  dateFrom?: string;
  /** ISO date string e.g. "2025-12-15" */
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// getAvailabilityByProduct — aggregate item counts per Product (design/type)
// ---------------------------------------------------------------------------

export async function getAvailabilityByProduct(
  params?: AvailabilityByCategoryParams
): Promise<ActionResult<ProductAvailability[]>> {
  try {
    await requirePermission("items:read");

    // Validate categoryId to prevent injection (it's used in raw SQL)
    const categoryId = params?.categoryId;
    if (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId)) {
      return { error: "Invalid categoryId" };
    }

    const categoryFilter = categoryId
      ? `AND i."categoryId" = '${categoryId}'`
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
      FROM "Item" i
      JOIN "Product" p ON p."id" = i."productId"
      JOIN "Category" c ON c."id" = i."categoryId"
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
      effectiveAvailableItems: Number(row.availableItems), // default = current available
    }));

    // Date-aware: add ASSIGNED items that are free during the requested period
    if (params?.dateFrom && params?.dateTo) {
      const dateFrom = new Date(params.dateFrom);
      const dateTo = new Date(params.dateTo);
      dateTo.setHours(23, 59, 59, 999);

      // Find ASSIGNED items per product that have NO blocking booking in the range.
      // A booking is "blocking" if its project is active AND dates are unknown (null)
      // OR overlap with [dateFrom, dateTo].
      const freeAssigned = await prisma.item.groupBy({
        by: ["productId"],
        where: {
          status: "ASSIGNED",
          ...(categoryId ? { categoryId } : {}),
          bookingItems: {
            none: {
              booking: {
                project: {
                  status: { notIn: ["COMPLETED", "CANCELLED"] },
                  OR: [
                    { startDate: null },
                    { endDate: null },
                    {
                      AND: [
                        { startDate: { lte: dateTo } },
                        { endDate: { gte: dateFrom } },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        _count: { id: true },
      });

      const freeMap = new Map(
        freeAssigned.map((r) => [r.productId, r._count.id])
      );

      for (const row of result) {
        row.effectiveAvailableItems =
          row.availableItems + (freeMap.get(row.productId) ?? 0);
      }
    }

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
