import { z } from "zod";

export const createPackSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().max(200).optional(),
  notes: z.string().optional(),
});

export const updatePackSchema = z.object({
  name: z.string().max(200).optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "PACKED", "IN_USE", "MAINTENANCE", "RETIRED", "LOST"]).optional(),
  condition: z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  notes: z.string().optional(),
});

export const addPackItemSchema = z.object({
  packId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type CreatePackInput = z.infer<typeof createPackSchema>;
export type UpdatePackInput = z.infer<typeof updatePackSchema>;
export type AddPackItemInput = z.infer<typeof addPackItemSchema>;
