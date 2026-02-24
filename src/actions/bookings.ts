"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import {
  createBookingSchema,
  updateBookingSchema,
  type CreateBookingInput,
  type UpdateBookingInput,
} from "@/lib/validators/booking";

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

export async function createBooking(
  data: CreateBookingInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("bookings:create");

    const parsed = createBookingSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });
    if (!project) {
      return { error: "Project not found" };
    }

    const kit = await prisma.kit.findUnique({
      where: { id: parsed.data.kitId },
    });
    if (!kit) {
      return { error: "Kit not found" };
    }

    if (parsed.data.kitVariantId) {
      const variant = await prisma.kitVariant.findUnique({
        where: { id: parsed.data.kitVariantId },
      });
      if (!variant || variant.kitId !== parsed.data.kitId) {
        return { error: "Variant not found or does not belong to this kit" };
      }
    }

    const booking = await prisma.projectBooking.create({
      data: parsed.data,
      include: {
        project: true,
        kit: true,
        variant: true,
        _count: { select: { items: true } },
      },
    });

    return { data: booking };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create booking" };
  }
}

// ---------------------------------------------------------------------------
// updateBooking
// ---------------------------------------------------------------------------

export async function updateBooking(
  id: string,
  data: UpdateBookingInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("bookings:update");

    const parsed = updateBookingSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.projectBooking.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Booking not found" };
    }

    if (parsed.data.kitVariantId) {
      const variant = await prisma.kitVariant.findUnique({
        where: { id: parsed.data.kitVariantId },
      });
      if (!variant || variant.kitId !== existing.kitId) {
        return { error: "Variant not found or does not belong to this kit" };
      }
    }

    const booking = await prisma.projectBooking.update({
      where: { id },
      data: parsed.data,
      include: {
        project: true,
        kit: true,
        variant: true,
        _count: { select: { items: true } },
      },
    });

    return { data: booking };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update booking" };
  }
}

// ---------------------------------------------------------------------------
// deleteBooking
// ---------------------------------------------------------------------------

export async function deleteBooking(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("bookings:delete");

    const existing = await prisma.projectBooking.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) {
      return { error: "Booking not found" };
    }

    if (existing._count.items > 0) {
      return {
        error: `Cannot delete booking: ${existing._count.items} item(s) are still assigned. Remove them first.`,
      };
    }

    await prisma.projectBooking.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete booking" };
  }
}

// ---------------------------------------------------------------------------
// assignItemToBooking — with double-booking prevention using project dates
// ---------------------------------------------------------------------------

export async function assignItemToBooking(
  bookingId: string,
  itemId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("bookings:assign");

    const session = await auth();
    const userId = session?.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.projectBooking.findUnique({
        where: { id: bookingId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
        },
      });

      if (!booking) throw new Error("Booking not found");
      if (!booking.project) throw new Error("Booking is not linked to a project");

      const item = await tx.item.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          humanReadableId: true,
          status: true,
        },
      });

      if (!item) throw new Error("Item not found");

      // Check if item is in a state that prevents assignment
      if (item.status === "RETIRED" || item.status === "LOST") {
        throw new Error(
          `Item ${item.humanReadableId} is ${item.status.toLowerCase()} and cannot be assigned`
        );
      }

      if (item.status === "MAINTENANCE") {
        throw new Error(
          `Item ${item.humanReadableId} is in maintenance and cannot be assigned`
        );
      }

      // Check already in this booking
      const existing = await tx.bookingItem.findFirst({
        where: { bookingId, itemId },
      });
      if (existing) {
        throw new Error(
          `Item ${item.humanReadableId} is already assigned to this booking`
        );
      }

      // Check for double-booking across overlapping projects
      if (booking.project.startDate && booking.project.endDate) {
        const overlapping = await tx.bookingItem.findFirst({
          where: {
            itemId,
            booking: {
              projectId: { not: booking.project.id },
              project: {
                status: { notIn: ["COMPLETED", "CANCELLED"] },
                startDate: { lt: booking.project.endDate! },
                endDate: { gt: booking.project.startDate! },
              },
            },
          },
          include: {
            booking: {
              include: {
                project: { select: { name: true } },
              },
            },
          },
        });

        if (overlapping) {
          throw new Error(
            `Item ${item.humanReadableId} is already assigned to "${overlapping.booking.project.name}" which overlaps with this project's dates`
          );
        }
      }

      // Create the booking item assignment
      const bookingItem = await tx.bookingItem.create({
        data: { bookingId, itemId },
        include: {
          item: { include: { product: true, category: true } },
        },
      });

      // Update item status to ASSIGNED
      await tx.item.update({
        where: { id: itemId },
        data: { status: "ASSIGNED" },
      });

      // Log history
      await tx.itemHistory.create({
        data: {
          itemId,
          action: "ASSIGNED_TO_BOOKING",
          performedById: userId ?? undefined,
          details: {
            bookingId,
            projectId: booking.project.id,
            projectName: booking.project.name,
          } as unknown as Prisma.InputJsonValue,
          newState: "ASSIGNED",
          previousState: item.status,
        },
      });

      return bookingItem;
    });

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign item to booking",
    };
  }
}

// ---------------------------------------------------------------------------
// removeItemFromBooking
// ---------------------------------------------------------------------------

export async function removeItemFromBooking(
  bookingItemId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("bookings:update");

    const session = await auth();
    const userId = session?.user?.id;

    await prisma.$transaction(async (tx) => {
      const bookingItem = await tx.bookingItem.findUnique({
        where: { id: bookingItemId },
        include: {
          item: { select: { id: true, status: true, humanReadableId: true } },
          booking: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!bookingItem) throw new Error("Booking item not found");

      await tx.bookingItem.delete({ where: { id: bookingItemId } });

      // Check if item is in any other bookings
      const otherAssignments = await tx.bookingItem.count({
        where: { itemId: bookingItem.itemId },
      });

      // If no other assignments, set back to AVAILABLE
      if (otherAssignments === 0) {
        await tx.item.update({
          where: { id: bookingItem.itemId },
          data: { status: "AVAILABLE" },
        });
      }

      // Log history
      await tx.itemHistory.create({
        data: {
          itemId: bookingItem.itemId,
          action: "REMOVED_FROM_BOOKING",
          performedById: userId ?? undefined,
          details: {
            bookingId: bookingItem.bookingId,
            projectId: bookingItem.booking.project.id,
            projectName: bookingItem.booking.project.name,
          } as unknown as Prisma.InputJsonValue,
          previousState: bookingItem.item.status,
          newState: otherAssignments === 0 ? "AVAILABLE" : bookingItem.item.status,
        },
      });
    });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove item from booking",
    };
  }
}

// ---------------------------------------------------------------------------
// checkItemAvailability
// ---------------------------------------------------------------------------

export async function checkItemAvailability(
  itemIds: string[],
  startDate: Date,
  endDate: Date,
  excludeProjectId?: string
): Promise<
  ActionResult<{
    available: string[];
    conflicting: {
      itemId: string;
      humanReadableId: string;
      projectName: string;
      projectId: string;
      projectStart: Date;
      projectEnd: Date;
    }[];
  }>
> {
  try {
    await requirePermission("items:read");

    if (itemIds.length === 0) {
      return { data: { available: [], conflicting: [] } };
    }

    // Find items already assigned to bookings in overlapping projects
    const conflicts = await prisma.bookingItem.findMany({
      where: {
        itemId: { in: itemIds },
        booking: {
          project: {
            ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
            status: { notIn: ["COMPLETED", "CANCELLED"] },
            startDate: { lt: endDate },
            endDate: { gt: startDate },
          },
        },
      },
      include: {
        item: { select: { humanReadableId: true } },
        booking: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    const conflictingItemIds = new Set(conflicts.map((c) => c.itemId));
    const available = itemIds.filter((id) => !conflictingItemIds.has(id));

    const conflicting = conflicts.map((c) => ({
      itemId: c.itemId,
      humanReadableId: c.item.humanReadableId,
      projectName: c.booking.project.name,
      projectId: c.booking.project.id,
      projectStart: c.booking.project.startDate!,
      projectEnd: c.booking.project.endDate!,
    }));

    return { data: { available, conflicting } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to check item availability",
    };
  }
}

// ---------------------------------------------------------------------------
// getBookingsForProject
// ---------------------------------------------------------------------------

export async function getBookingsForProject(
  projectId: string
): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("bookings:read");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return { error: "Project not found" };
    }

    const bookings = await prisma.projectBooking.findMany({
      where: { projectId },
      include: {
        kit: true,
        variant: true,
        items: {
          include: {
            item: {
              include: {
                product: true,
                category: true,
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: bookings };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch bookings for project",
    };
  }
}

// ---------------------------------------------------------------------------
// getItemBookings — Get all active bookings for an item
// ---------------------------------------------------------------------------

export async function getItemBookings(
  itemId: string
): Promise<
  ActionResult<
    {
      bookingItemId: string;
      bookingId: string;
      kitName: string;
      projectId: string;
      projectName: string;
      projectStatus: string;
      startDate: Date | null;
      endDate: Date | null;
    }[]
  >
> {
  try {
    await requirePermission("items:read");

    const bookings = await prisma.bookingItem.findMany({
      where: {
        itemId,
        booking: {
          project: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
      },
      include: {
        booking: {
          include: {
            kit: { select: { name: true } },
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        booking: { project: { startDate: "asc" } },
      },
    });

    return {
      data: bookings.map((b) => ({
        bookingItemId: b.id,
        bookingId: b.bookingId,
        kitName: b.booking.kit.name,
        projectId: b.booking.project.id,
        projectName: b.booking.project.name,
        projectStatus: b.booking.project.status,
        startDate: b.booking.project.startDate,
        endDate: b.booking.project.endDate,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to get item bookings",
    };
  }
}

// ---------------------------------------------------------------------------
// crossloadItem — Move an item from one project booking to another
// ---------------------------------------------------------------------------

export async function crossloadItem(
  bookingItemId: string,
  targetBookingId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("bookings:update");

    const session = await auth();
    const userId = session?.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      // Get source booking item
      const sourceBookingItem = await tx.bookingItem.findUnique({
        where: { id: bookingItemId },
        include: {
          item: {
            select: { id: true, humanReadableId: true, status: true },
          },
          booking: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!sourceBookingItem) throw new Error("Source booking item not found");

      // Get target booking
      const targetBooking = await tx.projectBooking.findUnique({
        where: { id: targetBookingId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      if (!targetBooking) throw new Error("Target booking not found");
      if (targetBooking.projectId === sourceBookingItem.booking.projectId) {
        throw new Error("Cannot crossload to the same project");
      }

      // Check if item is already in the target booking
      const alreadyInTarget = await tx.bookingItem.findFirst({
        where: {
          bookingId: targetBookingId,
          itemId: sourceBookingItem.itemId,
        },
      });
      if (alreadyInTarget) {
        throw new Error("Item is already assigned to the target booking");
      }

      // Remove from source
      await tx.bookingItem.delete({ where: { id: bookingItemId } });

      // Add to target
      const newBookingItem = await tx.bookingItem.create({
        data: {
          bookingId: targetBookingId,
          itemId: sourceBookingItem.itemId,
        },
        include: {
          item: { include: { product: true, category: true } },
        },
      });

      // Log crossload history
      await tx.itemHistory.create({
        data: {
          itemId: sourceBookingItem.itemId,
          action: "CROSSLOADED",
          performedById: userId ?? undefined,
          details: {
            fromProjectId: sourceBookingItem.booking.project.id,
            fromProjectName: sourceBookingItem.booking.project.name,
            fromBookingId: sourceBookingItem.bookingId,
            toProjectId: targetBooking.project.id,
            toProjectName: targetBooking.project.name,
            toBookingId: targetBookingId,
          } as unknown as Prisma.InputJsonValue,
          previousState: sourceBookingItem.item.status,
          newState: "ASSIGNED",
        },
      });

      return newBookingItem;
    });

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to crossload item",
    };
  }
}
