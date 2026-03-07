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

// Reusable include for all performer queries
const performerInclude = {
  contact: true,
} as const;

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

    const where: Prisma.PerformerWhereInput = {};

    if (params?.type) {
      where.type = params.type as Prisma.PerformerWhereInput["type"];
    }

    if (params?.search) {
      where.contact = {
        OR: [
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
        ],
      };
    }

    const [performers, total] = await Promise.all([
      prisma.performer.findMany({
        where,
        include: performerInclude,
        orderBy: [
          { contact: { lastName: "asc" } },
          { contact: { firstName: "asc" } },
        ],
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
        ...performerInclude,
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

    const { firstName, lastName, email, phone, type, sizes, notes, active, requiresExactSize, sizeFlexDirection } = parsed.data;

    const performer = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
        },
      });

      return tx.performer.create({
        data: {
          contactId: contact.id,
          type,
          sizes: sizes ? (sizes as Record<string, string>) : undefined,
          notes,
          active,
          requiresExactSize,
          sizeFlexDirection,
        },
        include: performerInclude,
      });
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

    const existing = await prisma.performer.findUnique({
      where: { id },
      select: { id: true, contactId: true },
    });
    if (!existing) {
      return { error: "Performer not found" };
    }

    const {
      firstName, lastName, email, phone, // contact fields
      type, sizes, notes, active, requiresExactSize, sizeFlexDirection, // performer fields
    } = parsed.data;

    const performer = await prisma.$transaction(async (tx) => {
      // Update contact if any personal fields provided
      const contactUpdates: Record<string, unknown> = {};
      if (firstName !== undefined) contactUpdates.firstName = firstName;
      if (lastName !== undefined) contactUpdates.lastName = lastName;
      if (email !== undefined) contactUpdates.email = email || null;
      if (phone !== undefined) contactUpdates.phone = phone || null;

      if (Object.keys(contactUpdates).length > 0) {
        await tx.contact.update({
          where: { id: existing.contactId },
          data: contactUpdates,
        });
      }

      // Build performer update data
      const performerData: Record<string, unknown> = {};
      if (type !== undefined) performerData.type = type;
      if (notes !== undefined) performerData.notes = notes;
      if (active !== undefined) performerData.active = active;
      if (requiresExactSize !== undefined) performerData.requiresExactSize = requiresExactSize;
      if (sizeFlexDirection !== undefined) performerData.sizeFlexDirection = sizeFlexDirection;
      if (sizes !== undefined) {
        performerData.sizes = sizes ? (sizes as Record<string, string>) : Prisma.DbNull;
      }

      return tx.performer.update({
        where: { id },
        data: performerData as Parameters<typeof tx.performer.update>[0]["data"],
        include: performerInclude,
      });
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
