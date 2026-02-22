"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validators/product";
import {
  createVariantSchema,
  updateVariantSchema,
  addVariantItemSchema,
  type CreateVariantInput,
  type UpdateVariantInput,
  type AddVariantItemInput,
} from "@/lib/validators/product-variant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductListParams {
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
// getProducts
// ---------------------------------------------------------------------------

export async function getProducts(
  params?: ProductListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("products:read");

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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            include: {
              _count: { select: { items: true } },
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
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch products" };
  }
}

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------

export async function getProductById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:read");

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            items: {
              include: {
                item: { include: { category: true } },
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

    if (!product) {
      return { error: "Product not found" };
    }

    return { data: product };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch product" };
  }
}

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------

export async function createProduct(
  data: CreateProductInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:create");

    const parsed = createProductSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const product = await prisma.product.create({
      data: parsed.data,
    });

    return { data: product };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create product" };
  }
}

// ---------------------------------------------------------------------------
// updateProduct
// ---------------------------------------------------------------------------

export async function updateProduct(
  id: string,
  data: UpdateProductInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:update");

    const parsed = updateProductSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Product not found" };
    }

    const product = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    return { data: product };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update product" };
  }
}

// ---------------------------------------------------------------------------
// deleteProduct
// ---------------------------------------------------------------------------

export async function deleteProduct(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("products:delete");

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Product not found" };
    }

    const bookingCount = await prisma.projectBooking.count({
      where: { productId: id },
    });

    if (bookingCount > 0) {
      return {
        error: `Cannot delete product: ${bookingCount} booking(s) still reference it`,
      };
    }

    await prisma.product.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete product" };
  }
}

// ---------------------------------------------------------------------------
// addProductTheme
// ---------------------------------------------------------------------------

export async function addProductTheme(
  productId: string,
  themeId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:update");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { error: "Product not found" };
    }

    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return { error: "Theme not found" };
    }

    const existing = await prisma.productTheme.findUnique({
      where: { productId_themeId: { productId, themeId } },
    });
    if (existing) {
      return { error: "Product is already linked to this theme" };
    }

    const productTheme = await prisma.productTheme.create({
      data: { productId, themeId },
      include: { theme: true, product: true },
    });

    return { data: productTheme };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add theme to product" };
  }
}

// ---------------------------------------------------------------------------
// removeProductTheme
// ---------------------------------------------------------------------------

export async function removeProductTheme(
  productId: string,
  themeId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("products:update");

    const existing = await prisma.productTheme.findUnique({
      where: { productId_themeId: { productId, themeId } },
    });
    if (!existing) {
      return { error: "Product-theme link not found" };
    }

    await prisma.productTheme.delete({
      where: { productId_themeId: { productId, themeId } },
    });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove theme from product" };
  }
}

// ---------------------------------------------------------------------------
// createVariant
// ---------------------------------------------------------------------------

export async function createVariant(
  data: CreateVariantInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:create");

    const parsed = createVariantSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
    });
    if (!product) {
      return { error: "Product not found" };
    }

    const variant = await prisma.productVariant.create({
      data: parsed.data,
      include: { product: true },
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
// updateVariant
// ---------------------------------------------------------------------------

export async function updateVariant(
  id: string,
  data: UpdateVariantInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:update");

    const parsed = updateVariantSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.productVariant.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Variant not found" };
    }

    const variant = await prisma.productVariant.update({
      where: { id },
      data: parsed.data,
      include: { product: true },
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
// deleteVariant
// ---------------------------------------------------------------------------

export async function deleteVariant(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("products:delete");

    const existing = await prisma.productVariant.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Variant not found" };
    }

    await prisma.productVariant.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete variant" };
  }
}

// ---------------------------------------------------------------------------
// addVariantItem
// ---------------------------------------------------------------------------

export async function addVariantItem(
  data: AddVariantItemInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:update");

    const parsed = addVariantItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: parsed.data.variantId },
    });
    if (!variant) {
      return { error: "Variant not found" };
    }

    const item = await prisma.item.findUnique({
      where: { id: parsed.data.itemId },
    });
    if (!item) {
      return { error: "Item not found" };
    }

    const existing = await prisma.productVariantItem.findUnique({
      where: {
        variantId_itemId: {
          variantId: parsed.data.variantId,
          itemId: parsed.data.itemId,
        },
      },
    });
    if (existing) {
      return { error: "Item is already part of this variant" };
    }

    const variantItem = await prisma.productVariantItem.create({
      data: parsed.data,
      include: {
        item: { include: { category: true } },
        variant: true,
      },
    });

    return { data: variantItem };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add item to variant" };
  }
}

// ---------------------------------------------------------------------------
// removeVariantItem
// ---------------------------------------------------------------------------

export async function removeVariantItem(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("products:update");

    const existing = await prisma.productVariantItem.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Variant item not found" };
    }

    await prisma.productVariantItem.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove item from variant" };
  }
}
