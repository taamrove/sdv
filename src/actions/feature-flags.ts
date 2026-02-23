"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  getAccessibleFlags,
  invalidateFlagCache,
  type AccessibleFlag,
} from "@/lib/feature-flags";
import {
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  type CreateFeatureFlagInput,
  type UpdateFeatureFlagInput,
} from "@/lib/validators/feature-flag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// getMyFeatureFlags — NO permission check (needed by all authenticated users)
// ---------------------------------------------------------------------------

export async function getMyFeatureFlags(): Promise<
  ActionResult<AccessibleFlag[]>
> {
  try {
    const flags = await getAccessibleFlags();
    return { data: flags };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch feature flags",
    };
  }
}

// ---------------------------------------------------------------------------
// getFeatureFlags — admin list all flags
// ---------------------------------------------------------------------------

export async function getFeatureFlags(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("admin:read");

    const flags = await prisma.featureFlag.findMany({
      include: {
        _count: { select: { betaUsers: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: flags };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch feature flags",
    };
  }
}

// ---------------------------------------------------------------------------
// getFeatureFlagById
// ---------------------------------------------------------------------------

export async function getFeatureFlagById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:read");

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
      include: {
        betaUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!flag) {
      return { error: "Feature flag not found" };
    }

    return { data: flag };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch feature flag",
    };
  }
}

// ---------------------------------------------------------------------------
// createFeatureFlag
// ---------------------------------------------------------------------------

export async function createFeatureFlag(
  data: CreateFeatureFlagInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:create");

    const parsed = createFeatureFlagSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.featureFlag.findUnique({
      where: { key: parsed.data.key },
    });

    if (existing) {
      return { error: "A feature flag with this key already exists" };
    }

    const flag = await prisma.featureFlag.create({
      data: {
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description,
        stage: parsed.data.stage,
      },
      include: {
        _count: { select: { betaUsers: true } },
      },
    });

    revalidatePath("/admin/feature-flags");
    return { data: flag };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create feature flag",
    };
  }
}

// ---------------------------------------------------------------------------
// updateFeatureFlag
// ---------------------------------------------------------------------------

export async function updateFeatureFlag(
  id: string,
  data: UpdateFeatureFlagInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:update");

    const parsed = updateFeatureFlagSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Feature flag not found" };
    }

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description,
        }),
        ...(parsed.data.stage !== undefined && { stage: parsed.data.stage }),
      },
      include: {
        _count: { select: { betaUsers: true } },
      },
    });

    invalidateFlagCache(existing.key);
    revalidatePath("/admin/feature-flags");
    return { data: flag };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update feature flag",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteFeatureFlag
// ---------------------------------------------------------------------------

export async function deleteFeatureFlag(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:delete");

    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Feature flag not found" };
    }

    await prisma.featureFlag.delete({ where: { id } });

    invalidateFlagCache(existing.key);
    revalidatePath("/admin/feature-flags");
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete feature flag",
    };
  }
}

// ---------------------------------------------------------------------------
// addBetaUser
// ---------------------------------------------------------------------------

export async function addBetaUser(
  flagId: string,
  userId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:update");

    const flag = await prisma.featureFlag.findUnique({ where: { id: flagId } });
    if (!flag) {
      return { error: "Feature flag not found" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { error: "User not found" };
    }

    const existing = await prisma.featureFlagUser.findUnique({
      where: { flagId_userId: { flagId, userId } },
    });

    if (existing) {
      return { error: "User is already a beta user for this flag" };
    }

    await prisma.featureFlagUser.create({
      data: { flagId, userId },
    });

    invalidateFlagCache(flag.key);
    revalidatePath("/admin/feature-flags");
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to add beta user",
    };
  }
}

// ---------------------------------------------------------------------------
// removeBetaUser
// ---------------------------------------------------------------------------

export async function removeBetaUser(
  flagId: string,
  userId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("admin:update");

    const flag = await prisma.featureFlag.findUnique({ where: { id: flagId } });
    if (!flag) {
      return { error: "Feature flag not found" };
    }

    await prisma.featureFlagUser.delete({
      where: { flagId_userId: { flagId, userId } },
    });

    invalidateFlagCache(flag.key);
    revalidatePath("/admin/feature-flags");
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to remove beta user",
    };
  }
}

// ---------------------------------------------------------------------------
// searchUsers — lightweight user search for the beta user combobox
// ---------------------------------------------------------------------------

export async function searchUsersForBetaFlag(
  search: string
): Promise<ActionResult<{ id: string; name: string; email: string }[]>> {
  try {
    await requirePermission("admin:read");

    const users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return { data: users };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to search users",
    };
  }
}
