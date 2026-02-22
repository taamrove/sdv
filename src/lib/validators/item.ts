import { z } from "zod";

export const createItemSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().nullable(),
  size: z.string().max(20).optional().nullable(),
  allowsSizeFlexibility: z.boolean().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
  size: z.string().max(20).optional().nullable(),
  allowsSizeFlexibility: z.boolean().optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
