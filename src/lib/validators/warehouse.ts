import { z } from "zod";

export const createWarehouseLocationSchema = z.object({
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
  zone: string;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
}): string {
  const parts = [data.zone];
  if (data.rack) parts.push(data.rack);
  if (data.shelf) parts.push(data.shelf);
  if (data.bin) parts.push(data.bin);
  return parts.join("-");
}
