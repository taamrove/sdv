"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validators/category";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<ActionResult<CategoryRow[]>> {
  try {
    await requirePermission("categories:read");

    const categories = await prisma.category.findMany({
      orderBy: { code: "asc" },
    });

    return { data: categories };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch categories" };
  }
}

// ---------------------------------------------------------------------------
// getCategoryById
// ---------------------------------------------------------------------------

export async function getCategoryById(
  id: string
): Promise<ActionResult<CategoryRow>> {
  try {
    await requirePermission("categories:read");

    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return { error: "Category not found" };
    }

    return { data: category };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch category" };
  }
}

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------

export async function createCategory(
  data: CreateCategoryInput
): Promise<ActionResult<CategoryRow>> {
  try {
    await requirePermission("categories:create");

    const parsed = createCategorySchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ code: parsed.data.code }, { name: parsed.data.name }],
      },
    });

    if (existing) {
      return {
        error:
          existing.code === parsed.data.code
            ? "A category with this code already exists"
            : "A category with this name already exists",
      };
    }

    const category = await prisma.category.create({
      data: parsed.data,
    });

    return { data: category };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create category" };
  }
}

// ---------------------------------------------------------------------------
// updateCategory
// ---------------------------------------------------------------------------

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<ActionResult<CategoryRow>> {
  try {
    await requirePermission("categories:update");

    const parsed = updateCategorySchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Category not found" };
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: { name: parsed.data.name, id: { not: id } },
      });
      if (duplicate) {
        return { error: "A category with this name already exists" };
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });

    return { data: category };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update category" };
  }
}

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------

export async function deleteCategory(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("categories:delete");

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Category not found" };
    }

    const itemCount = await prisma.item.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      return {
        error: `Cannot delete category: ${itemCount} item(s) still reference it`,
      };
    }

    await prisma.category.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete category" };
  }
}
