"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/validators/project";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProjectListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getProjects
// ---------------------------------------------------------------------------

export async function getProjects(
  params?: ProjectListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("projects:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { _count: { select: { assignments: true, bookings: true } } },
        orderBy: { startDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data: projects,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch projects" };
  }
}

// ---------------------------------------------------------------------------
// getProjectById
// ---------------------------------------------------------------------------

export async function getProjectById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("projects:read");

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { performer: true },
        },
        bookings: {
          include: {
            product: true,
            variant: true,
            _count: { select: { pieces: true } },
          },
        },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    return { data: project };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch project" };
  }
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

export async function createProject(
  data: CreateProjectInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("projects:create");

    const parsed = createProjectSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : undefined,
        endDate: parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : undefined,
      },
    });

    return { data: project };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create project" };
  }
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("projects:update");

    const parsed = updateProjectSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Project not found" };
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined
          ? { startDate: startDate ? new Date(startDate) : null }
          : {}),
        ...(endDate !== undefined
          ? { endDate: endDate ? new Date(endDate) : null }
          : {}),
      },
    });

    return { data: project };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update project" };
  }
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export async function deleteProject(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("projects:delete");

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Project not found" };
    }

    // Check for active assignments
    const assignmentCount = await prisma.performerAssignment.count({
      where: { projectId: id },
    });

    if (assignmentCount > 0) {
      return {
        error: `Cannot delete project: ${assignmentCount} performer assignment(s) still reference it`,
      };
    }

    await prisma.project.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete project" };
  }
}

// ---------------------------------------------------------------------------
// assignPerformer
// ---------------------------------------------------------------------------

export async function assignPerformer(
  projectId: string,
  performerId: string,
  role?: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("projects:assign");

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return { error: "Project not found" };
    }

    const performer = await prisma.performer.findUnique({ where: { id: performerId } });
    if (!performer) {
      return { error: "Performer not found" };
    }

    // Check for duplicate assignment
    const existing = await prisma.performerAssignment.findUnique({
      where: {
        performerId_projectId: { performerId, projectId },
      },
    });

    if (existing) {
      return { error: "Performer is already assigned to this project" };
    }

    const assignment = await prisma.performerAssignment.create({
      data: {
        projectId,
        performerId,
        role: role ?? null,
      },
      include: { performer: true, project: true },
    });

    return { data: assignment };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to assign performer" };
  }
}

// ---------------------------------------------------------------------------
// removePerformer
// ---------------------------------------------------------------------------

export async function removePerformer(
  assignmentId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("projects:assign");

    const existing = await prisma.performerAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      return { error: "Assignment not found" };
    }

    await prisma.performerAssignment.delete({ where: { id: assignmentId } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove performer" };
  }
}

// ---------------------------------------------------------------------------
// getProjectConflicts
// ---------------------------------------------------------------------------

export async function getProjectConflicts(
  projectId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("projects:read");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    if (!project.startDate || !project.endDate) {
      return { error: "Project must have both start and end dates to check conflicts" };
    }

    // Find all pieces assigned to this project via bookings
    const projectBookingPieces = await prisma.bookingPiece.findMany({
      where: {
        booking: { projectId },
      },
      select: { pieceId: true },
    });

    const pieceIds = projectBookingPieces.map((bp) => bp.pieceId);

    if (pieceIds.length === 0) {
      return { data: [] };
    }

    // Find overlapping projects that also use any of these pieces
    const conflicts = await prisma.bookingPiece.findMany({
      where: {
        pieceId: { in: pieceIds },
        booking: {
          projectId: { not: projectId },
          project: {
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
            },
            startDate: { lt: project.endDate },
            endDate: { gt: project.startDate },
          },
        },
      },
      include: {
        piece: {
          include: { item: true },
        },
        booking: {
          include: {
            project: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
          },
        },
      },
    });

    return { data: conflicts };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to check project conflicts" };
  }
}
