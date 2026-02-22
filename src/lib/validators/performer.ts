import { z } from "zod";

export const performerSizesSchema = z
  .object({
    chest: z.string().optional(),
    waist: z.string().optional(),
    hip: z.string().optional(),
    height: z.string().optional(),
    shoe: z.string().optional(),
    hat: z.string().optional(),
    size: z.string().optional(), // General size: XS, S, M, L, XL, etc.
  })
  .passthrough(); // Allow additional size fields

export const createPerformerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  type: z.enum(["DANCER", "VOCALIST", "MUSICIAN", "ACROBAT", "ACTOR", "OTHER"]),
  sizes: performerSizesSchema.optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  requiresExactSize: z.boolean().optional(),
  sizeFlexDirection: z.enum(["UP", "DOWN", "BOTH"]).optional().nullable(),
});

export type CreatePerformerInput = z.infer<typeof createPerformerSchema>;

export const updatePerformerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().optional().nullable(),
  type: z
    .enum(["DANCER", "VOCALIST", "MUSICIAN", "ACROBAT", "ACTOR", "OTHER"])
    .optional(),
  sizes: performerSizesSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  requiresExactSize: z.boolean().optional(),
  sizeFlexDirection: z.enum(["UP", "DOWN", "BOTH"]).optional().nullable(),
});

export type UpdatePerformerInput = z.infer<typeof updatePerformerSchema>;
