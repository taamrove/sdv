import { z } from "zod";

export const scanLookupSchema = z.object({
  humanReadableId: z.string().min(1, "Barcode is required").max(20),
});

export type ScanLookupInput = z.infer<typeof scanLookupSchema>;
