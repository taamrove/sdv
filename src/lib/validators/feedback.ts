import { z } from "zod";

export const createFeedbackSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().max(2000, "Description must be under 2000 characters").optional().or(z.literal("")),
  category: z.enum(["BUG", "FEATURE_REQUEST", "IMPROVEMENT"]),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const updateFeedbackSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "PLANNED", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  devNotes: z.string().max(2000).optional().or(z.literal("")),
});

export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
