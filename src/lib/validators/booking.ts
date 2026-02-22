import { z } from "zod";

export const createBookingSchema = z.object({
  projectId: z.string().uuid("Invalid project"),
  productId: z.string().uuid("Invalid product"),
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z.object({
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  status: z.enum(["DRAFT", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
