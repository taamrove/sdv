"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

type ActionResult<T = void> = { data: T } | { error: string };

const noteSchema = z.object({
  notes: z.string().min(1, "Note cannot be empty").max(2000),
});

export async function createPerformerNote(
  assignmentId: string,
  notes: string,
  bookingId?: string
): Promise<ActionResult<{ id: string; notes: string; createdAt: Date; bookingId: string | null }>> {
  try {
    await requirePermission("projects:update");

    const parsed = noteSchema.safeParse({ notes });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    // Verify the assignment exists
    const assignment = await prisma.performerAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      return { error: "Assignment not found" };
    }

    const note = await prisma.performerBookingNote.create({
      data: {
        performerAssignmentId: assignmentId,
        bookingId: bookingId ?? null,
        notes: parsed.data.notes,
      },
    });

    return { data: { id: note.id, notes: note.notes, createdAt: note.createdAt, bookingId: note.bookingId } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create note" };
  }
}

export async function updatePerformerNote(
  noteId: string,
  notes: string
): Promise<ActionResult> {
  try {
    await requirePermission("projects:update");

    const parsed = noteSchema.safeParse({ notes });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const note = await prisma.performerBookingNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return { error: "Note not found" };
    }

    await prisma.performerBookingNote.update({
      where: { id: noteId },
      data: { notes: parsed.data.notes },
    });

    return { data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update note" };
  }
}

export async function deletePerformerNote(noteId: string): Promise<ActionResult> {
  try {
    await requirePermission("projects:update");

    const note = await prisma.performerBookingNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return { error: "Note not found" };
    }

    await prisma.performerBookingNote.delete({ where: { id: noteId } });

    return { data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete note" };
  }
}
