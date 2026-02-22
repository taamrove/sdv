import { z } from "zod";

export const checkInSchema = z.object({
  pieceId: z.string().uuid("Invalid piece"),
  action: z.enum(["INVENTORY", "MAINTENANCE"]),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  maintenanceTitle: z.string().min(1).max(200).optional(),
  maintenanceSeverity: z.enum(["MINOR", "MODERATE", "UNUSABLE"]).optional(),
  notes: z.string().max(2000).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
