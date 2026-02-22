"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createQuarantineDefaultSchema,
  type CreateQuarantineDefaultInput,
} from "@/lib/validators/quarantine-default";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// getQuarantineDefaults
// ---------------------------------------------------------------------------

export async function getQuarantineDefaults(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("maintenance:read");

    const defaults = await prisma.categoryQuarantineDefault.findMany({
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { severity: "asc" }],
    });

    return { data: defaults };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch quarantine defaults",
    };
  }
}

// ---------------------------------------------------------------------------
// upsertQuarantineDefault
// ---------------------------------------------------------------------------

export async function upsertQuarantineDefault(
  data: CreateQuarantineDefaultInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:create");

    const parsed = createQuarantineDefaultSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return { error: "Category not found" };
    }

    const result = await prisma.categoryQuarantineDefault.upsert({
      where: {
        categoryId_severity: {
          categoryId: parsed.data.categoryId,
          severity: parsed.data.severity,
        },
      },
      update: {
        defaultQuarantineDays: parsed.data.defaultQuarantineDays,
      },
      create: {
        categoryId: parsed.data.categoryId,
        severity: parsed.data.severity,
        defaultQuarantineDays: parsed.data.defaultQuarantineDays,
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to upsert quarantine default",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteQuarantineDefault
// ---------------------------------------------------------------------------

export async function deleteQuarantineDefault(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("maintenance:delete");

    const existing = await prisma.categoryQuarantineDefault.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Quarantine default not found" };
    }

    await prisma.categoryQuarantineDefault.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to delete quarantine default",
    };
  }
}
