import { z } from "zod";

export const itemSizesSchema = z
  .object({
    chest: z.string().optional(),
    waist: z.string().optional(),
    hip: z.string().optional(),
    height: z.string().optional(),
    shoe: z.string().optional(),
    hat: z.string().optional(),
    size: z.string().optional(),
  })
  .passthrough();

export const createItemSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  sizes: itemSizesSchema.optional(),
  color: z.string().max(50).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  condition: z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  isExternal: z.boolean().optional(),
  mainPerformerId: z.string().uuid().optional().nullable(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  sizes: itemSizesSchema.optional(),
  color: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  condition: z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "PACKED", "IN_USE", "MAINTENANCE", "RETIRED", "LOST"]).optional(),
  isExternal: z.boolean().optional(),
  mainPerformerId: z.string().uuid().optional().nullable(),
  archived: z.boolean().optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
