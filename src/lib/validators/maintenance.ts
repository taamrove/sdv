import { z } from "zod";

export const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  itemId: z.string().uuid("Invalid item"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  severity: z.enum(["MINOR", "MODERATE", "UNUSABLE"]).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z
    .enum([
      "REPORTED",
      "ASSESSED",
      "IN_PROGRESS",
      "AWAITING_PARTS",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  severity: z.enum(["MINOR", "MODERATE", "UNUSABLE"]).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  estimatedCompletion: z.string().optional().nullable(), // ISO date string
  quarantineEndsAt: z.string().optional().nullable(),
  quarantineType: z.enum(["NONE", "AUTO", "MANUAL"]).optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(2000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
