"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createKitSchema,
  updateKitSchema,
  type CreateKitInput,
  type UpdateKitInput,
} from "@/lib/validators/kit";
import {
  createVariantSchema,
  updateVariantSchema,
  addVariantProductSchema,
  type CreateVariantInput,
  type UpdateVariantInput,
  type AddVariantProductInput,
} from "@/lib/validators/kit-variant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface KitListParams {
  search?: string;
  themeId?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getKits
// ---------------------------------------------------------------------------

export async function getKits(
  params?: KitListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("kits:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    if (params?.themeId) {
      where.themes = { some: { themeId: params.themeId } };
    }

    const [kits, total] = await Promise.all([
      prisma.kit.findMany({
        where,
        include: {
          variants: {
            include: {
              _count: { select: { products: true } },
            },
          },
          themes: {
            include: { theme: true },
          },
          _count: { select: { bookings: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.kit.count({ where }),
    ]);

    return {
      data: kits,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch kits" };
  }
}

// ---------------------------------------------------------------------------
// getKitById
// ---------------------------------------------------------------------------

export async function getKitById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:read");

    const kit = await prisma.kit.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            products: {
              include: {
                product: { include: { category: true } },
              },
            },
          },
        },
        themes: {
          include: { theme: true },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!kit) {
      return { error: "Kit not found" };
    }

    return { data: kit };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch kit" };
  }
}

// ---------------------------------------------------------------------------
// createKit
// ---------------------------------------------------------------------------

export async function createKit(
  data: CreateKitInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:create");

    const parsed = createKitSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const kit = await prisma.kit.create({
      data: parsed.data,
    });

    return { data: kit };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create kit" };
  }
}

// ---------------------------------------------------------------------------
// updateKit
// ---------------------------------------------------------------------------

export async function updateKit(
  id: string,
  data: UpdateKitInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:update");

    const parsed = updateKitSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.kit.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Kit not found" };
    }

    const kit = await prisma.kit.update({
      where: { id },
      data: parsed.data,
    });

    return { data: kit };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update kit" };
  }
}

// ---------------------------------------------------------------------------
// deleteKit
// ---------------------------------------------------------------------------

export async function deleteKit(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("kits:delete");

    const existing = await prisma.kit.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Kit not found" };
    }

    const bookingCount = await prisma.projectBooking.count({
      where: { kitId: id },
    });

    if (bookingCount > 0) {
      return {
        error: `Cannot delete kit: ${bookingCount} booking(s) still reference it`,
      };
    }

    await prisma.kit.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete kit" };
  }
}

// ---------------------------------------------------------------------------
// addKitTheme
// ---------------------------------------------------------------------------

export async function addKitTheme(
  kitId: string,
  themeId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:update");

    const kit = await prisma.kit.findUnique({ where: { id: kitId } });
    if (!kit) {
      return { error: "Kit not found" };
    }

    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return { error: "Theme not found" };
    }

    const existing = await prisma.kitTheme.findUnique({
      where: { kitId_themeId: { kitId, themeId } },
    });
    if (existing) {
      return { error: "Kit is already linked to this theme" };
    }

    const kitTheme = await prisma.kitTheme.create({
      data: { kitId, themeId },
      include: { theme: true, kit: true },
    });

    return { data: kitTheme };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add theme to kit" };
  }
}

// ---------------------------------------------------------------------------
// removeKitTheme
// ---------------------------------------------------------------------------

export async function removeKitTheme(
  kitId: string,
  themeId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("kits:update");

    const existing = await prisma.kitTheme.findUnique({
      where: { kitId_themeId: { kitId, themeId } },
    });
    if (!existing) {
      return { error: "Kit-theme link not found" };
    }

    await prisma.kitTheme.delete({
      where: { kitId_themeId: { kitId, themeId } },
    });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove theme from kit" };
  }
}

// ---------------------------------------------------------------------------
// createKitVariant
// ---------------------------------------------------------------------------

export async function createKitVariant(
  data: CreateVariantInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:create");

    const parsed = createVariantSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i: { message: string }) => i.message).join(", ") };
    }

    const kit = await prisma.kit.findUnique({
      where: { id: parsed.data.kitId },
    });
    if (!kit) {
      return { error: "Kit not found" };
    }

    const variant = await prisma.kitVariant.create({
      data: parsed.data,
      include: { kit: true },
    });

    return { data: variant };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create variant" };
  }
}

// ---------------------------------------------------------------------------
// updateKitVariant
// ---------------------------------------------------------------------------

export async function updateKitVariant(
  id: string,
  data: UpdateVariantInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:update");

    const parsed = updateVariantSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i: { message: string }) => i.message).join(", ") };
    }

    const existing = await prisma.kitVariant.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Variant not found" };
    }

    const variant = await prisma.kitVariant.update({
      where: { id },
      data: parsed.data,
      include: { kit: true },
    });

    return { data: variant };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update variant" };
  }
}

// ---------------------------------------------------------------------------
// deleteKitVariant
// ---------------------------------------------------------------------------

export async function deleteKitVariant(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("kits:delete");

    const existing = await prisma.kitVariant.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Variant not found" };
    }

    await prisma.kitVariant.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete variant" };
  }
}

// ---------------------------------------------------------------------------
// addVariantProduct
// ---------------------------------------------------------------------------

export async function addVariantProduct(
  data: AddVariantProductInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("kits:update");

    const parsed = addVariantProductSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const variant = await prisma.kitVariant.findUnique({
      where: { id: parsed.data.variantId },
    });
    if (!variant) {
      return { error: "Variant not found" };
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
    });
    if (!product) {
      return { error: "Product not found" };
    }

    const existing = await prisma.kitVariantProduct.findUnique({
      where: {
        variantId_productId: {
          variantId: parsed.data.variantId,
          productId: parsed.data.productId,
        },
      },
    });
    if (existing) {
      return { error: "Product is already part of this variant" };
    }

    const variantProduct = await prisma.kitVariantProduct.create({
      data: parsed.data,
      include: {
        product: { include: { category: true } },
        variant: true,
      },
    });

    return { data: variantProduct };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add product to variant" };
  }
}

// ---------------------------------------------------------------------------
// removeVariantProduct
// ---------------------------------------------------------------------------

export async function removeVariantProduct(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("kits:update");

    const existing = await prisma.kitVariantProduct.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Variant product not found" };
    }

    await prisma.kitVariantProduct.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove product from variant" };
  }
}
