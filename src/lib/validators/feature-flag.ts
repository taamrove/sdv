import { z } from "zod";

export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be 100 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Key must be lowercase alphanumeric with hyphens"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),
  stage: z.enum(["DEVELOPMENT", "ALPHA", "BETA", "PRODUCTION"]).default("DEVELOPMENT"),
});

export const updateFeatureFlagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .nullable(),
  stage: z.enum(["DEVELOPMENT", "ALPHA", "BETA", "PRODUCTION"]).optional(),
});

export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>;
