import { z } from "zod";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createContainerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum([
    "SUITCASE",
    "BAG",
    "BOX",
    "GARMENT_BAG",
    "SHOE_BOX",
    "HAT_BOX",
    "CUSTOM",
  ]),
  description: z.string().max(500).optional(),
  projectId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export type CreateContainerInput = z.infer<typeof createContainerSchema>;

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateContainerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z
    .enum([
      "SUITCASE",
      "BAG",
      "BOX",
      "GARMENT_BAG",
      "SHOE_BOX",
      "HAT_BOX",
      "CUSTOM",
    ])
    .optional(),
  description: z.string().max(500).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  status: z
    .enum([
      "EMPTY",
      "PACKING",
      "PACKED",
      "IN_TRANSIT",
      "AT_VENUE",
      "RETURNED",
      "UNPACKED",
    ])
    .optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateContainerInput = z.infer<typeof updateContainerSchema>;

// ---------------------------------------------------------------------------
// Pack item
// ---------------------------------------------------------------------------

export const packItemSchema = z.object({
  containerId: z.string().uuid("Invalid container"),
  itemId: z.string().uuid("Invalid item"),
});

export type PackItemInput = z.infer<typeof packItemSchema>;
