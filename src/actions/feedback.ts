"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  type CreateFeedbackInput,
  type UpdateFeedbackInput,
} from "@/lib/validators/feedback";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FeedbackListParams {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getMyFeedback — current user's own submissions
// ---------------------------------------------------------------------------

export async function getMyFeedback(): Promise<ActionResult<unknown[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const feedback = await prisma.feedbackTicket.findMany({
      where: { submittedById: user.id },
      orderBy: { createdAt: "desc" },
    });

    return { data: feedback };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch feedback" };
  }
}

// ---------------------------------------------------------------------------
// createFeedback — submit new feedback (any authenticated user)
// ---------------------------------------------------------------------------

export async function createFeedback(
  data: CreateFeedbackInput
): Promise<ActionResult<unknown>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const parsed = createFeedbackSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const feedback = await prisma.feedbackTicket.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        submittedById: user.id,
      },
    });

    return { data: feedback };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create feedback" };
  }
}

// ---------------------------------------------------------------------------
// getFeedback — paginated list of all feedback (admin/dev)
// ---------------------------------------------------------------------------

export async function getFeedback(
  params?: FeedbackListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("feedback:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [feedback, total] = await Promise.all([
      prisma.feedbackTicket.findMany({
        where,
        include: {
          submittedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedbackTicket.count({ where }),
    ]);

    return {
      data: feedback,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch feedback" };
  }
}

// ---------------------------------------------------------------------------
// getFeedbackById
// ---------------------------------------------------------------------------

export async function getFeedbackById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("feedback:read");

    const feedback = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!feedback) {
      return { error: "Feedback not found" };
    }

    return { data: feedback };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch feedback" };
  }
}

// ---------------------------------------------------------------------------
// updateFeedback — update status, priority, dev notes (admin/dev)
// ---------------------------------------------------------------------------

export async function updateFeedback(
  id: string,
  data: UpdateFeedbackInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("feedback:update");

    const parsed = updateFeedbackSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.feedbackTicket.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Feedback not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      // Set resolvedAt when resolving or closing
      if (parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED") {
        updateData.resolvedAt = new Date();
      } else if (existing.resolvedAt) {
        // Clear resolvedAt if reopening
        updateData.resolvedAt = null;
      }
    }

    if (parsed.data.priority !== undefined) {
      updateData.priority = parsed.data.priority;
    }

    if (parsed.data.devNotes !== undefined) {
      updateData.devNotes = parsed.data.devNotes || null;
    }

    const feedback = await prisma.feedbackTicket.update({
      where: { id },
      data: updateData,
      include: {
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return { data: feedback };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update feedback" };
  }
}

// ---------------------------------------------------------------------------
// deleteFeedback — hard delete (admin/dev)
// ---------------------------------------------------------------------------

export async function deleteFeedback(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("feedback:delete");

    const existing = await prisma.feedbackTicket.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Feedback not found" };
    }

    await prisma.feedbackTicket.delete({ where: { id } });

    return { data: { id } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete feedback" };
  }
}
