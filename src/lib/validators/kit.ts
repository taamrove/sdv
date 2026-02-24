import { z } from "zod";

export const createKitSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateKitInput = z.infer<typeof createKitSchema>;

export const updateKitSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateKitInput = z.infer<typeof updateKitSchema>;
