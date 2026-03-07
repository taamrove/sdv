"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import { buildHumanReadableId } from "@/lib/human-id";
import { getFullName } from "@/lib/format-name";
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
  productId?: string;
  status?: string;
  search?: string;
  warehouseLocationId?: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.productId) {
      where.productId = params.productId;
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
          product: {
            name: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    // By default, exclude archived items unless explicitly requested
    if (!params?.includeArchived) {
      where.archived = false;
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          product: true,
          category: true,
          warehouseLocation: true,
        },
        orderBy: { createdAt: "desc" },
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
      include: {
        product: true,
        category: true,
        warehouseLocation: true,
      },
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

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      include: { category: true },
    });

    if (!product) {
      return { error: "Product not found" };
    }

    const user = await getCurrentUser();

    const item = await prisma.$transaction(async (tx) => {
      // Get next sequence within the transaction for safety
      const lastItem = await tx.item.findFirst({
        where: { productId: product.id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const sequence = (lastItem?.sequence ?? 0) + 1;

      const humanReadableId = buildHumanReadableId(
        product.category.code,
        product.number,
        sequence
      );

      const created = await tx.item.create({
        data: {
          categoryId: product.categoryId,
          productId: product.id,
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
          mainPerformerId: parsed.data.mainPerformerId ?? undefined,
        },
        include: {
          product: true,
          category: true,
          warehouseLocation: true,
        },
      });

      // Record history
      await tx.itemHistory.create({
        data: {
          itemId: created.id,
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

    return { data: item };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create item" };
  }
}

// ---------------------------------------------------------------------------
// createItems (batch)
// ---------------------------------------------------------------------------

export async function createItems(
  data: CreateItemInput,
  quantity: number
): Promise<ActionResult<{ count: number }>> {
  try {
    await requirePermission("items:create");

    const parsed = createItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const qty = Math.min(Math.max(1, Math.round(quantity)), 20);

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      include: { category: true },
    });

    if (!product) {
      return { error: "Product not found" };
    }

    const user = await getCurrentUser();

    const created = await prisma.$transaction(async (tx) => {
      const lastItem = await tx.item.findFirst({
        where: { productId: product.id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      let nextSequence = (lastItem?.sequence ?? 0) + 1;

      const items = [];
      for (let i = 0; i < qty; i++) {
        const sequence = nextSequence++;
        const humanReadableId = buildHumanReadableId(
          product.category.code,
          product.number,
          sequence
        );

        const item = await tx.item.create({
          data: {
            categoryId: product.categoryId,
            productId: product.id,
            sequence,
            humanReadableId,
            sizes: parsed.data.sizes
              ? (parsed.data.sizes as Record<string, string>)
              : undefined,
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
            mainPerformerId: parsed.data.mainPerformerId ?? undefined,
          },
        });

        await tx.itemHistory.create({
          data: {
            itemId: item.id,
            action: "CREATED",
            performedById: user?.id ?? null,
            newState: {
              status: item.status,
              condition: item.condition,
              warehouseLocationId: item.warehouseLocationId,
            },
          },
        });

        items.push(item);
      }
      return items;
    });

    return { data: { count: created.length } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to create items",
    };
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

    const user = await getCurrentUser();

    // ------------------------------------------------------------------
    // Resolve human-readable performer names for the state snapshot
    // ------------------------------------------------------------------
    let prevPerformerName: string | null = null;
    let nextPerformerName: string | null = null;

    if (existing.mainPerformerId) {
      const p = await prisma.performer.findUnique({
        where: { id: existing.mainPerformerId },
        select: { contact: { select: { firstName: true, lastName: true } } },
      });
      if (p) prevPerformerName = getFullName(p.contact);
    }

    const updatingPerformer = "mainPerformerId" in parsed.data;
    const newPerformerId = updatingPerformer
      ? parsed.data.mainPerformerId
      : existing.mainPerformerId;

    if (newPerformerId && newPerformerId !== existing.mainPerformerId) {
      const p = await prisma.performer.findUnique({
        where: { id: newPerformerId },
        select: { contact: { select: { firstName: true, lastName: true } } },
      });
      if (p) nextPerformerName = getFullName(p.contact);
    } else if (!updatingPerformer || newPerformerId === existing.mainPerformerId) {
      nextPerformerName = prevPerformerName; // unchanged
    }
    // else: performer explicitly set to null (removed) → nextPerformerName stays null

    // ------------------------------------------------------------------
    // Determine the most specific history action
    // ------------------------------------------------------------------
    let historyAction: string = "UPDATED";
    if (parsed.data.status && parsed.data.status !== existing.status) {
      historyAction = "STATUS_CHANGED";
    } else if (parsed.data.condition && parsed.data.condition !== existing.condition) {
      historyAction = "CONDITION_CHANGED";
    } else if (
      parsed.data.warehouseLocationId !== undefined &&
      parsed.data.warehouseLocationId !== existing.warehouseLocationId
    ) {
      historyAction = "LOCATION_CHANGED";
    }

    const item = await prisma.$transaction(async (tx) => {
      const { sizes, ...rest } = parsed.data;
      const updateData = {
        ...rest,
        ...(sizes ? { sizes: sizes as Record<string, string> } : {}),
      };
      const updated = await tx.item.update({
        where: { id },
        data: updateData as Parameters<typeof tx.item.update>[0]["data"],
        include: {
          product: true,
          category: true,
          warehouseLocation: true,
        },
      });

      // Full state snapshot — covers every user-visible field
      await tx.itemHistory.create({
        data: {
          itemId: id,
          action: historyAction as never,
          performedById: user?.id ?? null,
          previousState: {
            status: existing.status,
            condition: existing.condition,
            warehouseLocationId: existing.warehouseLocationId,
            mainPerformerName: prevPerformerName,
            color: existing.color ?? null,
            notes: existing.notes ?? null,
            archived: existing.archived,
          },
          newState: {
            status: updated.status,
            condition: updated.condition,
            warehouseLocationId: updated.warehouseLocationId,
            mainPerformerName: nextPerformerName,
            color: updated.color ?? null,
            notes: updated.notes ?? null,
            archived: updated.archived,
          },
        },
      });

      return updated;
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
// deleteItem (soft delete -> status = RETIRED)
// ---------------------------------------------------------------------------

export async function deleteItem(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("items:delete");

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Item not found" };
    }

    const user = await getCurrentUser();

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.item.update({
        where: { id },
        data: { status: "RETIRED" },
        include: {
          product: true,
          category: true,
          warehouseLocation: true,
        },
      });

      await tx.itemHistory.create({
        data: {
          itemId: id,
          action: "RETIRED",
          performedById: user?.id ?? null,
          previousState: { status: existing.status },
          newState: { status: "RETIRED" },
        },
      });

      return updated;
    });

    return { data: item };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete item" };
  }
}

// ---------------------------------------------------------------------------
// getItemHistory
// ---------------------------------------------------------------------------

export async function getItemHistory(
  itemId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("items:read");

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return { error: "Item not found" };
    }

    const history = await prisma.itemHistory.findMany({
      where: { itemId },
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
    return { error: error instanceof Error ? error.message : "Failed to fetch item history" };
  }
}
