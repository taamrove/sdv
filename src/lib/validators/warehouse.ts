import { z } from "zod";

export const createWarehouseLocationSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  room: z.string().max(50).optional(),
  zone: z.string().min(1, "Zone is required").max(20),
  rack: z.string().max(20).optional(),
  shelf: z.string().max(20).optional(),
  bin: z.string().max(20).optional(),
  description: z.string().max(200).optional(),
});

export type CreateWarehouseLocationInput = z.infer<
  typeof createWarehouseLocationSchema
>;

export const updateWarehouseLocationSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  room: z.string().max(50).optional().nullable(),
  zone: z.string().min(1, "Zone is required").max(20).optional(),
  rack: z.string().max(20).optional().nullable(),
  shelf: z.string().max(20).optional().nullable(),
  bin: z.string().max(20).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
});

export type UpdateWarehouseLocationInput = z.infer<
  typeof updateWarehouseLocationSchema
>;

export function buildLocationLabel(data: {
  room?: string | null;
  zone: string;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
}): string {
  return [data.room, data.zone, data.rack, data.shelf, data.bin]
    .filter(Boolean)
    .join("-");
}
