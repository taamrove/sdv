"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> = { data: T } | { error: string };

const subCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  sizeMode: z.enum(["clothing", "shoes", "hat", "measurements"]).nullable().optional(),
  order: z.number().int().optional(),
});

export async function getSubCategories(categoryId?: string) {
  try {
    const subCategories = await prisma.subCategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true },
      orderBy: [{ categoryId: "asc" }, { order: "asc" }, { name: "asc" }],
    });
    return { data: subCategories };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch sub-categories" };
  }
}

export async function createSubCategory(
  categoryId: string,
  name: string,
  sizeMode?: string | null,
  order?: number
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requirePermission("category:create");

    const parsed = subCategorySchema.safeParse({ name, sizeMode, order });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return { error: "Category not found" };

    const existing = await prisma.subCategory.findFirst({
      where: { categoryId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return { error: "A sub-category with this name already exists in this category" };

    const sub = await prisma.subCategory.create({
      data: {
        categoryId,
        name: parsed.data.name,
        sizeMode: parsed.data.sizeMode ?? null,
        order: parsed.data.order ?? 0,
      },
    });

    revalidatePath("/admin/categories");
    return { data: { id: sub.id, name: sub.name } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to create sub-category" };
  }
}

export async function updateSubCategory(
  id: string,
  name: string,
  sizeMode?: string | null,
  order?: number
): Promise<ActionResult> {
  try {
    await requirePermission("category:update");

    const parsed = subCategorySchema.safeParse({ name, sizeMode, order });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) return { error: "Sub-category not found" };

    await prisma.subCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        sizeMode: parsed.data.sizeMode ?? null,
        order: parsed.data.order ?? existing.order,
      },
    });

    revalidatePath("/admin/categories");
    return { data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to update sub-category" };
  }
}

export async function deleteSubCategory(id: string): Promise<ActionResult> {
  try {
    await requirePermission("category:delete");

    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) return { error: "Sub-category not found" };

    // Unlink products before deleting
    await prisma.product.updateMany({
      where: { subCategoryId: id },
      data: { subCategoryId: null },
    });

    await prisma.subCategory.delete({ where: { id } });

    revalidatePath("/admin/categories");
    return { data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
    return { error: error instanceof Error ? error.message : "Failed to delete sub-category" };
  }
}
