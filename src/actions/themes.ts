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
    await requirePermission("kits:read");

    const themes = await prisma.theme.findMany({
      include: {
        _count: { select: { kits: true } },
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
    await requirePermission("kits:read");

    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        kits: {
          include: {
            kit: true,
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
    await requirePermission("kits:create");

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
    await requirePermission("kits:update");

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
    await requirePermission("kits:delete");

    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Theme not found" };
    }

    // Check for kits linked to this theme
    const kitCount = await prisma.kitTheme.count({
      where: { themeId: id },
    });

    if (kitCount > 0) {
      return {
        error: `Cannot delete theme: ${kitCount} kit(s) still reference it`,
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
// getThemeKits — list kits linked to a theme
// ---------------------------------------------------------------------------

export async function getThemeKits(
  themeId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("kits:read");

    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return { error: "Theme not found" };
    }

    const kitThemes = await prisma.kitTheme.findMany({
      where: { themeId },
      include: {
        kit: {
          include: {
            _count: { select: { variants: true, bookings: true } },
          },
        },
      },
      orderBy: { kit: { name: "asc" } },
    });

    return { data: kitThemes.map((kt) => kt.kit) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch theme kits" };
  }
}
