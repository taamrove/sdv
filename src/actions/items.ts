"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { getNextItemNumber } from "@/lib/human-id";
import {
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validators/item";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ItemListParams {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getItems
// ---------------------------------------------------------------------------

export async function getItems(
  params?: ItemListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("items:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { category: true },
        orderBy: [{ category: { code: "asc" } }, { number: "asc" }],
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    return {
      data: items,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch items" };
  }
}

// ---------------------------------------------------------------------------
// getItemById
// ---------------------------------------------------------------------------

export async function getItemById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("items:read");

    const item = await prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    return { data: item };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch item" };
  }
}

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------

export async function createItem(
  data: CreateItemInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("items:create");

    const parsed = createItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

    const number = await getNextItemNumber(parsed.data.categoryId);

    const item = await prisma.item.create({
      data: {
        ...parsed.data,
        number,
      },
      include: { category: true },
    });

    return { data: item };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create item" };
  }
}

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

export async function updateItem(
  id: string,
  data: UpdateItemInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("items:update");

    const parsed = updateItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Item not found" };
    }

    const item = await prisma.item.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    });

    return { data: item };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update item" };
  }
}

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

export async function deleteItem(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("items:delete");

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Item not found" };
    }

    const pieceCount = await prisma.piece.count({
      where: { itemId: id },
    });

    if (pieceCount > 0) {
      return {
        error: `Cannot delete item: ${pieceCount} piece(s) still reference it`,
      };
    }

    await prisma.item.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete item" };
  }
}
