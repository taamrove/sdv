import { z } from "zod";

export const createVariantSchema = z.object({
  kitId: z.string().uuid("Invalid kit"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

export const addVariantProductSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid("Invalid product"),
  quantity: z.number().int().min(1).default(1),
  required: z.boolean().default(true),
  notes: z.string().optional(),
});

export type AddVariantProductInput = z.infer<typeof addVariantProductSchema>;
