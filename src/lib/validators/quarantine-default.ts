import { z } from "zod";

export const createQuarantineDefaultSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  severity: z.enum(["MINOR", "MODERATE", "UNUSABLE"]),
  defaultQuarantineDays: z.number().int().min(0).max(365),
});

export type CreateQuarantineDefaultInput = z.infer<typeof createQuarantineDefaultSchema>;

export const updateQuarantineDefaultSchema = z.object({
  defaultQuarantineDays: z.number().int().min(0).max(365),
});

export type UpdateQuarantineDefaultInput = z.infer<typeof updateQuarantineDefaultSchema>;
