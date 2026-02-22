import { z } from "zod";

export const createVariantSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

export const addVariantItemSchema = z.object({
  variantId: z.string().uuid(),
  itemId: z.string().uuid("Invalid item"),
  quantity: z.number().int().min(1).default(1),
  required: z.boolean().default(true),
  notes: z.string().optional(),
});

export type AddVariantItemInput = z.infer<typeof addVariantItemSchema>;
