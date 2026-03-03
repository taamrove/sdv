"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createPerformerSchema,
  updatePerformerSchema,
  type CreatePerformerInput,
  type UpdatePerformerInput,
} from "@/lib/validators/performer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PerformerListParams {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getPerformers
// ---------------------------------------------------------------------------

export async function getPerformers(
  params?: PerformerListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("performers:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [performers, total] = await Promise.all([
      prisma.performer.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
      }),
      prisma.performer.count({ where }),
    ]);

    return {
      data: performers,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch performers" };
  }
}

// ---------------------------------------------------------------------------
// getPerformerById
// ---------------------------------------------------------------------------

export async function getPerformerById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("performers:read");

    const performer = await prisma.performer.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { project: true },
        },
      },
    });

    if (!performer) {
      return { error: "Performer not found" };
    }

    return { data: performer };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch performer" };
  }
}

// ---------------------------------------------------------------------------
// createPerformer
// ---------------------------------------------------------------------------

export async function createPerformer(
  data: CreatePerformerInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("performers:create");

    const parsed = createPerformerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const performer = await prisma.performer.create({
      data: {
        ...parsed.data,
        sizes: parsed.data.sizes
          ? (parsed.data.sizes as Record<string, string>)
          : undefined,
      },
    });

    return { data: performer };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create performer" };
  }
}

// ---------------------------------------------------------------------------
// updatePerformer
// ---------------------------------------------------------------------------

export async function updatePerformer(
  id: string,
  data: UpdatePerformerInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("performers:update");

    const parsed = updatePerformerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.performer.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Performer not found" };
    }

    const { sizes, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      ...(sizes !== undefined
        ? { sizes: sizes ? (sizes as Record<string, string>) : Prisma.DbNull }
        : {}),
    };

    const performer = await prisma.performer.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.performer.update>[0]["data"],
    });

    return { data: performer };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update performer" };
  }
}

// ---------------------------------------------------------------------------
// deletePerformer (soft delete -> set active = false)
// ---------------------------------------------------------------------------

export async function deletePerformer(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("performers:delete");

    const existing = await prisma.performer.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Performer not found" };
    }

    // Check for active assignments (projects that are not completed/cancelled)
    const activeAssignmentCount = await prisma.performerAssignment.count({
      where: {
        performerId: id,
        project: {
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
      },
    });

    if (activeAssignmentCount > 0) {
      return {
        error: `Cannot deactivate performer: ${activeAssignmentCount} active project assignment(s) still reference them`,
      };
    }

    const performer = await prisma.performer.update({
      where: { id },
      data: { active: false },
    });

    return { data: performer };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete performer" };
  }
}
