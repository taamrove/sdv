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

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
    });
    if (!product) {
      return { error: "Product not found" };
    }

    if (parsed.data.productVariantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: parsed.data.productVariantId },
      });
      if (!variant || variant.productId !== parsed.data.productId) {
        return { error: "Variant not found or does not belong to this product" };
      }
    }

    const booking = await prisma.projectBooking.create({
      data: parsed.data,
      include: {
        project: true,
        product: true,
        variant: true,
        _count: { select: { pieces: true } },
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

    if (parsed.data.productVariantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: parsed.data.productVariantId },
      });
      if (!variant || variant.productId !== existing.productId) {
        return { error: "Variant not found or does not belong to this product" };
      }
    }

    const booking = await prisma.projectBooking.update({
      where: { id },
      data: parsed.data,
      include: {
        project: true,
        product: true,
        variant: true,
        _count: { select: { pieces: true } },
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
      include: { _count: { select: { pieces: true } } },
    });
    if (!existing) {
      return { error: "Booking not found" };
    }

    if (existing._count.pieces > 0) {
      return {
        error: `Cannot delete booking: ${existing._count.pieces} piece(s) are still assigned. Remove them first.`,
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
// assignPieceToBooking — with double-booking prevention using project dates
// ---------------------------------------------------------------------------

export async function assignPieceToBooking(
  bookingId: string,
  pieceId: string
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

      const piece = await tx.piece.findUnique({
        where: { id: pieceId },
        select: {
          id: true,
          humanReadableId: true,
          status: true,
        },
      });

      if (!piece) throw new Error("Piece not found");

      // Check if piece is in a state that prevents assignment
      if (piece.status === "RETIRED" || piece.status === "LOST") {
        throw new Error(
          `Piece ${piece.humanReadableId} is ${piece.status.toLowerCase()} and cannot be assigned`
        );
      }

      if (piece.status === "MAINTENANCE") {
        throw new Error(
          `Piece ${piece.humanReadableId} is in maintenance and cannot be assigned`
        );
      }

      // Check already in this booking
      const existing = await tx.bookingPiece.findFirst({
        where: { bookingId, pieceId },
      });
      if (existing) {
        throw new Error(
          `Piece ${piece.humanReadableId} is already assigned to this booking`
        );
      }

      // Check for double-booking across overlapping projects
      if (booking.project.startDate && booking.project.endDate) {
        const overlapping = await tx.bookingPiece.findFirst({
          where: {
            pieceId,
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
            `Piece ${piece.humanReadableId} is already assigned to "${overlapping.booking.project.name}" which overlaps with this project's dates`
          );
        }
      }

      // Create the booking piece assignment
      const bookingPiece = await tx.bookingPiece.create({
        data: { bookingId, pieceId },
        include: {
          piece: { include: { item: true, category: true } },
        },
      });

      // Update piece status to ASSIGNED
      await tx.piece.update({
        where: { id: pieceId },
        data: { status: "ASSIGNED" },
      });

      // Log history
      await tx.pieceHistory.create({
        data: {
          pieceId,
          action: "ASSIGNED_TO_BOOKING",
          performedById: userId ?? undefined,
          details: {
            bookingId,
            projectId: booking.project.id,
            projectName: booking.project.name,
          } as unknown as Prisma.InputJsonValue,
          newState: "ASSIGNED",
          previousState: piece.status,
        },
      });

      return bookingPiece;
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
          : "Failed to assign piece to booking",
    };
  }
}

// ---------------------------------------------------------------------------
// removePieceFromBooking
// ---------------------------------------------------------------------------

export async function removePieceFromBooking(
  bookingPieceId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("bookings:update");

    const session = await auth();
    const userId = session?.user?.id;

    await prisma.$transaction(async (tx) => {
      const bookingPiece = await tx.bookingPiece.findUnique({
        where: { id: bookingPieceId },
        include: {
          piece: { select: { id: true, status: true, humanReadableId: true } },
          booking: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!bookingPiece) throw new Error("Booking piece not found");

      await tx.bookingPiece.delete({ where: { id: bookingPieceId } });

      // Check if piece is in any other bookings
      const otherAssignments = await tx.bookingPiece.count({
        where: { pieceId: bookingPiece.pieceId },
      });

      // If no other assignments, set back to AVAILABLE
      if (otherAssignments === 0) {
        await tx.piece.update({
          where: { id: bookingPiece.pieceId },
          data: { status: "AVAILABLE" },
        });
      }

      // Log history
      await tx.pieceHistory.create({
        data: {
          pieceId: bookingPiece.pieceId,
          action: "REMOVED_FROM_BOOKING",
          performedById: userId ?? undefined,
          details: {
            bookingId: bookingPiece.bookingId,
            projectId: bookingPiece.booking.project.id,
            projectName: bookingPiece.booking.project.name,
          } as unknown as Prisma.InputJsonValue,
          previousState: bookingPiece.piece.status,
          newState: otherAssignments === 0 ? "AVAILABLE" : bookingPiece.piece.status,
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
          : "Failed to remove piece from booking",
    };
  }
}

// ---------------------------------------------------------------------------
// checkPieceAvailability
// ---------------------------------------------------------------------------

export async function checkPieceAvailability(
  pieceIds: string[],
  startDate: Date,
  endDate: Date,
  excludeProjectId?: string
): Promise<
  ActionResult<{
    available: string[];
    conflicting: {
      pieceId: string;
      humanReadableId: string;
      projectName: string;
      projectId: string;
      projectStart: Date;
      projectEnd: Date;
    }[];
  }>
> {
  try {
    await requirePermission("pieces:read");

    if (pieceIds.length === 0) {
      return { data: { available: [], conflicting: [] } };
    }

    // Find pieces already assigned to bookings in overlapping projects
    const conflicts = await prisma.bookingPiece.findMany({
      where: {
        pieceId: { in: pieceIds },
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
        piece: { select: { humanReadableId: true } },
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

    const conflictingPieceIds = new Set(conflicts.map((c) => c.pieceId));
    const available = pieceIds.filter((id) => !conflictingPieceIds.has(id));

    const conflicting = conflicts.map((c) => ({
      pieceId: c.pieceId,
      humanReadableId: c.piece.humanReadableId,
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
          : "Failed to check piece availability",
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
        product: true,
        variant: true,
        pieces: {
          include: {
            piece: {
              include: {
                item: true,
                category: true,
              },
            },
          },
        },
        _count: { select: { pieces: true } },
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
// getPieceBookings — Get all active bookings for a piece
// ---------------------------------------------------------------------------

export async function getPieceBookings(
  pieceId: string
): Promise<
  ActionResult<
    {
      bookingPieceId: string;
      bookingId: string;
      productName: string;
      projectId: string;
      projectName: string;
      projectStatus: string;
      startDate: Date | null;
      endDate: Date | null;
    }[]
  >
> {
  try {
    await requirePermission("pieces:read");

    const bookings = await prisma.bookingPiece.findMany({
      where: {
        pieceId,
        booking: {
          project: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
      },
      include: {
        booking: {
          include: {
            product: { select: { name: true } },
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
        bookingPieceId: b.id,
        bookingId: b.bookingId,
        productName: b.booking.product.name,
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
          : "Failed to get piece bookings",
    };
  }
}

// ---------------------------------------------------------------------------
// crossloadPiece — Move a piece from one project booking to another
// ---------------------------------------------------------------------------

export async function crossloadPiece(
  bookingPieceId: string,
  targetBookingId: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("bookings:update");

    const session = await auth();
    const userId = session?.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      // Get source booking piece
      const sourceBookingPiece = await tx.bookingPiece.findUnique({
        where: { id: bookingPieceId },
        include: {
          piece: {
            select: { id: true, humanReadableId: true, status: true },
          },
          booking: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!sourceBookingPiece) throw new Error("Source booking piece not found");

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
      if (targetBooking.projectId === sourceBookingPiece.booking.projectId) {
        throw new Error("Cannot crossload to the same project");
      }

      // Check if piece is already in the target booking
      const alreadyInTarget = await tx.bookingPiece.findFirst({
        where: {
          bookingId: targetBookingId,
          pieceId: sourceBookingPiece.pieceId,
        },
      });
      if (alreadyInTarget) {
        throw new Error("Piece is already assigned to the target booking");
      }

      // Remove from source
      await tx.bookingPiece.delete({ where: { id: bookingPieceId } });

      // Add to target
      const newBookingPiece = await tx.bookingPiece.create({
        data: {
          bookingId: targetBookingId,
          pieceId: sourceBookingPiece.pieceId,
        },
        include: {
          piece: { include: { item: true, category: true } },
        },
      });

      // Log crossload history
      await tx.pieceHistory.create({
        data: {
          pieceId: sourceBookingPiece.pieceId,
          action: "CROSSLOADED",
          performedById: userId ?? undefined,
          details: {
            fromProjectId: sourceBookingPiece.booking.project.id,
            fromProjectName: sourceBookingPiece.booking.project.name,
            fromBookingId: sourceBookingPiece.bookingId,
            toProjectId: targetBooking.project.id,
            toProjectName: targetBooking.project.name,
            toBookingId: targetBookingId,
          } as unknown as Prisma.InputJsonValue,
          previousState: sourceBookingPiece.piece.status,
          newState: "ASSIGNED",
        },
      });

      return newBookingPiece;
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
          : "Failed to crossload piece",
    };
  }
}
