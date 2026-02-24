"use server";

import { ItemStatus, ItemCondition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

interface PackListParams {
  productId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// getPacks
// ---------------------------------------------------------------------------

export async function getPacks(
  params?: PackListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("packs:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.productId) {
      where.productId = params.productId;
    }

    if (params?.status) {
      where.status = params.status;
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

    const [packs, total] = await Promise.all([
      prisma.pack.findMany({
        where,
        include: {
          product: true,
          packItems: {
            include: {
              item: { include: { product: true, category: true } },
            },
          },
          _count: { select: { packItems: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pack.count({ where }),
    ]);

    return {
      data: packs,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch packs" };
  }
}

// ---------------------------------------------------------------------------
// getPackById
// ---------------------------------------------------------------------------

export async function getPackById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("packs:read");

    const pack = await prisma.pack.findUnique({
      where: { id },
      include: {
        product: true,
        packItems: {
          include: {
            item: { include: { product: true, category: true } },
          },
        },
        _count: { select: { packItems: true } },
      },
    });

    if (!pack) {
      return { error: "Pack not found" };
    }

    return { data: pack };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch pack" };
  }
}

// ---------------------------------------------------------------------------
// createPack
// ---------------------------------------------------------------------------

export async function createPack(
  data: {
    productId: string;
    humanReadableId: string;
    notes?: string;
  }
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("packs:create");

    if (!data.productId || !data.humanReadableId) {
      return { error: "productId and humanReadableId are required" };
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      return { error: "Product not found" };
    }

    const existing = await prisma.pack.findUnique({
      where: { humanReadableId: data.humanReadableId },
    });
    if (existing) {
      return { error: "A pack with this humanReadableId already exists" };
    }

    const pack = await prisma.pack.create({
      data: {
        productId: data.productId,
        humanReadableId: data.humanReadableId,
        notes: data.notes,
      },
      include: {
        product: true,
        _count: { select: { packItems: true } },
      },
    });

    revalidatePath("/packs");

    return { data: pack };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create pack" };
  }
}

// ---------------------------------------------------------------------------
// updatePack
// ---------------------------------------------------------------------------

export async function updatePack(
  id: string,
  data: {
    status?: ItemStatus;
    condition?: ItemCondition;
    notes?: string;
  }
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("packs:update");

    const existing = await prisma.pack.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Pack not found" };
    }

    const pack = await prisma.pack.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        product: true,
        _count: { select: { packItems: true } },
      },
    });

    revalidatePath("/packs");

    return { data: pack };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update pack" };
  }
}

// ---------------------------------------------------------------------------
// deletePack
// ---------------------------------------------------------------------------

export async function deletePack(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("packs:delete");

    const existing = await prisma.pack.findUnique({
      where: { id },
      include: { _count: { select: { packItems: true } } },
    });
    if (!existing) {
      return { error: "Pack not found" };
    }

    if (existing._count.packItems > 0) {
      return {
        error: `Cannot delete pack: ${existing._count.packItems} item(s) are still assigned. Remove them first.`,
      };
    }

    await prisma.pack.delete({ where: { id } });

    revalidatePath("/packs");

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete pack" };
  }
}

// ---------------------------------------------------------------------------
// addPackItem
// ---------------------------------------------------------------------------

export async function addPackItem(
  packId: string,
  itemId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("packs:update");

    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) {
      return { error: "Pack not found" };
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return { error: "Item not found" };
    }

    const existing = await prisma.packItem.findFirst({
      where: { packId, itemId },
    });
    if (existing) {
      return { error: "Item is already in this pack" };
    }

    const packItem = await prisma.packItem.create({
      data: { packId, itemId },
      include: {
        item: { include: { product: true, category: true } },
        pack: true,
      },
    });

    revalidatePath("/packs");

    return { data: packItem };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add item to pack" };
  }
}

// ---------------------------------------------------------------------------
// removePackItem
// ---------------------------------------------------------------------------

export async function removePackItem(
  packId: string,
  itemId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("packs:update");

    const existing = await prisma.packItem.findFirst({
      where: { packId, itemId },
    });
    if (!existing) {
      return { error: "Item is not in this pack" };
    }

    await prisma.packItem.delete({ where: { id: existing.id } });

    revalidatePath("/packs");

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove item from pack" };
  }
}
