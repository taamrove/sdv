import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  subCategoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().nullable(),
  allowsSizeFlexibility: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  subCategoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
  allowsSizeFlexibility: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
