"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { getNextProductNumber } from "@/lib/human-id";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validators/product";

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

    const where: Record<string, unknown> = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, subCategory: true },
        orderBy: [{ category: { code: "asc" } }, { number: "asc" }],
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
      include: { category: true, subCategory: true },
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

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

    const number = await getNextProductNumber(parsed.data.categoryId);

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        number,
      },
      include: { category: true, subCategory: true },
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
      include: { category: true, subCategory: true },
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

    const itemCount = await prisma.item.count({
      where: { productId: id },
    });

    if (itemCount > 0) {
      return {
        error: `Cannot delete product: ${itemCount} item(s) still reference it`,
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
