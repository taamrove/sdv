"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

type ActionResult<T> = { data: T } | { error: string };

const changelogSchema = z.object({
  version: z.string().min(1, "Version is required"),
  title: z.string().min(1, "Title is required"),
  changes: z.string().min(1, "Changes are required"),
  buildId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// getChangelog — public for all authenticated users
// ---------------------------------------------------------------------------

export async function getChangelog(): Promise<
  ActionResult<
    {
      id: string;
      version: string;
      title: string;
      changes: string;
      buildId: string | null;
      createdAt: Date;
    }[]
  >
> {
  try {
    const entries = await prisma.changelogEntry.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { data: entries };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch changelog",
    };
  }
}

// ---------------------------------------------------------------------------
// createChangelogEntry — admin only
// ---------------------------------------------------------------------------

export async function createChangelogEntry(data: {
  version: string;
  title: string;
  changes: string;
  buildId?: string | null;
}): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:create");

    const parsed = changelogSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const entry = await prisma.changelogEntry.create({
      data: {
        version: parsed.data.version,
        title: parsed.data.title,
        changes: parsed.data.changes,
        buildId: parsed.data.buildId ?? null,
      },
    });

    revalidatePath("/changelog");
    return { data: entry };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create changelog entry",
    };
  }
}

// ---------------------------------------------------------------------------
// updateChangelogEntry — admin only
// ---------------------------------------------------------------------------

export async function updateChangelogEntry(
  id: string,
  data: {
    version?: string;
    title?: string;
    changes?: string;
    buildId?: string | null;
  }
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:update");

    const entry = await prisma.changelogEntry.update({
      where: { id },
      data: {
        ...(data.version !== undefined && { version: data.version }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.changes !== undefined && { changes: data.changes }),
        ...(data.buildId !== undefined && { buildId: data.buildId }),
      },
    });

    revalidatePath("/changelog");
    return { data: entry };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update changelog entry",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteChangelogEntry — admin only
// ---------------------------------------------------------------------------

export async function deleteChangelogEntry(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:delete");

    await prisma.changelogEntry.delete({ where: { id } });

    revalidatePath("/changelog");
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete changelog entry",
    };
  }
}
