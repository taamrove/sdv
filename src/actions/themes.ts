"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createThemeSchema,
  updateThemeSchema,
  type CreateThemeInput,
  type UpdateThemeInput,
} from "@/lib/validators/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// getThemes
// ---------------------------------------------------------------------------

export async function getThemes(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("products:read");

    const themes = await prisma.theme.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return { data: themes };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch themes" };
  }
}

// ---------------------------------------------------------------------------
// getThemeById
// ---------------------------------------------------------------------------

export async function getThemeById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:read");

    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!theme) {
      return { error: "Theme not found" };
    }

    return { data: theme };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch theme" };
  }
}

// ---------------------------------------------------------------------------
// createTheme
// ---------------------------------------------------------------------------

export async function createTheme(
  data: CreateThemeInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:create");

    const parsed = createThemeSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const theme = await prisma.theme.create({
      data: parsed.data,
    });

    return { data: theme };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create theme" };
  }
}

// ---------------------------------------------------------------------------
// updateTheme
// ---------------------------------------------------------------------------

export async function updateTheme(
  id: string,
  data: UpdateThemeInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("products:update");

    const parsed = updateThemeSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Theme not found" };
    }

    const theme = await prisma.theme.update({
      where: { id },
      data: parsed.data,
    });

    return { data: theme };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update theme" };
  }
}

// ---------------------------------------------------------------------------
// deleteTheme
// ---------------------------------------------------------------------------

export async function deleteTheme(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("products:delete");

    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Theme not found" };
    }

    // Check for products linked to this theme
    const productCount = await prisma.productTheme.count({
      where: { themeId: id },
    });

    if (productCount > 0) {
      return {
        error: `Cannot delete theme: ${productCount} product(s) still reference it`,
      };
    }

    await prisma.theme.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete theme" };
  }
}

// ---------------------------------------------------------------------------
// getThemeProducts — list products linked to a theme
// ---------------------------------------------------------------------------

export async function getThemeProducts(
  themeId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("products:read");

    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return { error: "Theme not found" };
    }

    const productThemes = await prisma.productTheme.findMany({
      where: { themeId },
      include: {
        product: {
          include: {
            _count: { select: { variants: true, bookings: true } },
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    });

    return { data: productThemes.map((pt) => pt.product) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch theme products" };
  }
}
