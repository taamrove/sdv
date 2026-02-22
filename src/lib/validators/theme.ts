import { z } from "zod";

export const createThemeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateThemeInput = z.infer<typeof createThemeSchema>;

export const updateThemeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
