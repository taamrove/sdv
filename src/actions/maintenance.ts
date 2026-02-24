"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/rbac";
import {
  createTicketSchema,
  updateTicketSchema,
  createCommentSchema,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "@/lib/validators/maintenance";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TicketListParams {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getTickets
// ---------------------------------------------------------------------------

export async function getTickets(
  params?: TicketListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("maintenance:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.priority) {
      where.priority = params.priority;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        {
          item: {
            humanReadableId: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where,
        include: {
          item: { include: { product: true, category: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { photos: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.maintenanceTicket.count({ where }),
    ]);

    return {
      data: tickets,
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
    return { error: error instanceof Error ? error.message : "Failed to fetch tickets" };
  }
}

// ---------------------------------------------------------------------------
// getTicketById
// ---------------------------------------------------------------------------

export async function getTicketById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:read");

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        item: {
          include: { product: true, category: true, warehouseLocation: true },
        },
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        photos: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return { error: "Ticket not found" };
    }

    return { data: ticket };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch ticket" };
  }
}

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------

export async function createTicket(
  data: CreateTicketInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:create");

    const parsed = createTicketSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const item = await prisma.item.findUnique({
      where: { id: parsed.data.itemId },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    if (["MAINTENANCE", "RETIRED", "LOST"].includes(item.status)) {
      return {
        error: `Item is currently ${item.status} and cannot be sent to maintenance`,
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const previousState = item.status;

    // If severity is MINOR, item stays in its current status (still usable)
    const severity = parsed.data.severity ?? null;
    const newItemStatus =
      severity === "MINOR" ? previousState : "MAINTENANCE";

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceTicket.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          itemId: parsed.data.itemId,
          priority: parsed.data.priority,
          severity: severity,
          reportedById: user.id,
        },
        include: {
          item: { include: { product: true, category: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { photos: true, comments: true } },
        },
      });

      if (newItemStatus !== previousState) {
        await tx.item.update({
          where: { id: parsed.data.itemId },
          data: { status: "MAINTENANCE" },
        });
      }

      await tx.itemHistory.create({
        data: {
          itemId: parsed.data.itemId,
          action: "MAINTENANCE_STARTED",
          performedById: user.id,
          previousState: previousState as unknown as Prisma.InputJsonValue,
          newState: newItemStatus as unknown as Prisma.InputJsonValue,
          details: {
            ticketId: created.id,
            title: parsed.data.title,
            severity: severity,
          } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return { data: ticket };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create ticket" };
  }
}

// ---------------------------------------------------------------------------
// updateTicket
// ---------------------------------------------------------------------------

export async function updateTicket(
  id: string,
  data: UpdateTicketInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:update");

    const parsed = updateTicketSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.maintenanceTicket.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Ticket not found" };
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.estimatedCompletion !== undefined) {
      updateData.estimatedCompletion = parsed.data.estimatedCompletion
        ? new Date(parsed.data.estimatedCompletion)
        : null;
    }

    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const ticket = await prisma.maintenanceTicket.update({
      where: { id },
      data: updateData,
      include: {
        item: { include: { product: true, category: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { photos: true, comments: true } },
      },
    });

    return { data: ticket };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update ticket" };
  }
}

// ---------------------------------------------------------------------------
// deleteTicket (soft delete)
// ---------------------------------------------------------------------------

export async function deleteTicket(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("maintenance:delete");

    const existing = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!existing) {
      return { error: "Ticket not found" };
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return { error: `Cannot delete a ticket that is already ${existing.status}` };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.maintenanceTicket.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      if (existing.item.status === "MAINTENANCE") {
        await tx.item.update({
          where: { id: existing.itemId },
          data: { status: "AVAILABLE" },
        });

        await tx.itemHistory.create({
          data: {
            itemId: existing.itemId,
            action: "MAINTENANCE_COMPLETED",
            performedById: user.id,
            previousState: "MAINTENANCE" as unknown as Prisma.InputJsonValue,
            newState: "AVAILABLE" as unknown as Prisma.InputJsonValue,
            details: {
              ticketId: existing.id,
              reason: "Ticket cancelled",
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete ticket" };
  }
}

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

export async function addComment(
  ticketId: string,
  content: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:update");

    const parsed = createCommentSchema.safeParse({ content });
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return { error: "Ticket not found" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const comment = await prisma.maintenanceComment.create({
      data: {
        ticketId,
        userId: user.id,
        content: parsed.data.content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { data: comment };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add comment" };
  }
}

// ---------------------------------------------------------------------------
// addPhoto
// ---------------------------------------------------------------------------

export async function addPhoto(
  ticketId: string,
  url: string,
  caption?: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:update");

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return { error: "Ticket not found" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const photo = await prisma.maintenancePhoto.create({
      data: {
        ticketId,
        url,
        caption: caption ?? null,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { data: photo };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to add photo" };
  }
}

// ---------------------------------------------------------------------------
// removePhoto
// ---------------------------------------------------------------------------

export async function removePhoto(
  photoId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("maintenance:update");

    const photo = await prisma.maintenancePhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) {
      return { error: "Photo not found" };
    }

    await prisma.maintenancePhoto.delete({ where: { id: photoId } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to remove photo" };
  }
}

// ---------------------------------------------------------------------------
// assignTicket
// ---------------------------------------------------------------------------

export async function assignTicket(
  ticketId: string,
  userId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:assign");

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return { error: "Ticket not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { error: "User not found" };
    }
    if (!user.active) {
      return { error: "Cannot assign to an inactive user" };
    }

    const updated = await prisma.maintenanceTicket.update({
      where: { id: ticketId },
      data: { assignedToId: userId },
      include: {
        item: { include: { product: true, category: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { photos: true, comments: true } },
      },
    });

    return { data: updated };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to assign ticket" };
  }
}

// ---------------------------------------------------------------------------
// completeTicket
// ---------------------------------------------------------------------------

export async function completeTicket(
  ticketId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:update");

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
      include: { item: true },
    });

    if (!ticket) {
      return { error: "Ticket not found" };
    }

    if (ticket.status === "COMPLETED") {
      return { error: "Ticket is already completed" };
    }

    if (ticket.status === "CANCELLED") {
      return { error: "Ticket is cancelled and cannot be completed" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    // Look up quarantine default for this item's category + ticket severity
    let quarantineDefault = null;
    if (
      ticket.severity &&
      ticket.severity !== "MINOR" &&
      ticket.item.categoryId
    ) {
      quarantineDefault = await prisma.categoryQuarantineDefault.findUnique({
        where: {
          categoryId_severity: {
            categoryId: ticket.item.categoryId,
            severity: ticket.severity,
          },
        },
      });
    }

    const shouldQuarantine =
      quarantineDefault &&
      quarantineDefault.defaultQuarantineDays > 0 &&
      ticket.severity !== "MINOR";

    const updated = await prisma.$transaction(async (tx) => {
      const ticketUpdateData: Record<string, unknown> = {
        status: "COMPLETED",
        completedAt: new Date(),
      };

      if (shouldQuarantine) {
        const quarantineEndsAt = new Date();
        quarantineEndsAt.setDate(
          quarantineEndsAt.getDate() + quarantineDefault!.defaultQuarantineDays
        );
        ticketUpdateData.quarantineEndsAt = quarantineEndsAt;
        ticketUpdateData.quarantineType = "AUTO";
      }

      const completedTicket = await tx.maintenanceTicket.update({
        where: { id: ticketId },
        data: ticketUpdateData,
        include: {
          item: { include: { product: true, category: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { photos: true, comments: true } },
        },
      });

      if (shouldQuarantine) {
        // Keep item in MAINTENANCE status during quarantine
        await tx.itemHistory.create({
          data: {
            itemId: ticket.itemId,
            action: "QUARANTINE_STARTED",
            performedById: user.id,
            previousState: "MAINTENANCE" as unknown as Prisma.InputJsonValue,
            newState: "MAINTENANCE" as unknown as Prisma.InputJsonValue,
            details: {
              ticketId: ticket.id,
              quarantineEndsAt: ticketUpdateData.quarantineEndsAt,
              quarantineDays: quarantineDefault!.defaultQuarantineDays,
              quarantineType: "AUTO",
            } as Prisma.InputJsonValue,
          },
        });
      } else {
        // No quarantine: set item to AVAILABLE immediately
        await tx.item.update({
          where: { id: ticket.itemId },
          data: { status: "AVAILABLE" },
        });

        await tx.itemHistory.create({
          data: {
            itemId: ticket.itemId,
            action: "MAINTENANCE_COMPLETED",
            performedById: user.id,
            previousState: "MAINTENANCE" as unknown as Prisma.InputJsonValue,
            newState: "AVAILABLE" as unknown as Prisma.InputJsonValue,
            details: {
              ticketId: ticket.id,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return completedTicket;
    });

    return { data: updated };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to complete ticket" };
  }
}

// ---------------------------------------------------------------------------
// overrideQuarantine
// ---------------------------------------------------------------------------

export async function overrideQuarantine(
  ticketId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("maintenance:update");

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
      include: { item: true },
    });

    if (!ticket) {
      return { error: "Ticket not found" };
    }

    if (!ticket.quarantineEndsAt || ticket.quarantineEndsAt <= new Date()) {
      return { error: "This ticket is not currently in quarantine" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not found" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.maintenanceTicket.update({
        where: { id: ticketId },
        data: {
          quarantineEndsAt: new Date(),
          quarantineType: "MANUAL",
        },
        include: {
          item: { include: { product: true, category: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { photos: true, comments: true } },
        },
      });

      await tx.item.update({
        where: { id: ticket.itemId },
        data: { status: "AVAILABLE" },
      });

      await tx.itemHistory.create({
        data: {
          itemId: ticket.itemId,
          action: "QUARANTINE_ENDED",
          performedById: user.id,
          previousState: "MAINTENANCE" as unknown as Prisma.InputJsonValue,
          newState: "AVAILABLE" as unknown as Prisma.InputJsonValue,
          details: {
            ticketId: ticket.id,
            quarantineType: "MANUAL",
            overriddenBy: user.id,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedTicket;
    });

    return { data: updated };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to override quarantine",
    };
  }
}

// ---------------------------------------------------------------------------
// getQuarantineItems
// ---------------------------------------------------------------------------

export async function getQuarantineItems(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("maintenance:read");

    const now = new Date();

    const tickets = await prisma.maintenanceTicket.findMany({
      where: {
        status: "COMPLETED",
        quarantineEndsAt: { gt: now },
      },
      include: {
        item: {
          include: {
            product: true,
            category: true,
          },
        },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { quarantineEndsAt: "asc" },
    });

    return { data: tickets };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch quarantine items",
    };
  }
}
