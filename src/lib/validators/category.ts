import { z } from "zod";

export const createCategorySchema = z.object({
  code: z
    .string()
    .length(1, "Code must be a single letter")
    .regex(/^[A-Z]$/, "Code must be an uppercase letter"),
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50).optional(),
  description: z.string().max(200).optional().nullable(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
