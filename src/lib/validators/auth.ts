import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const phoneSchema = z
  .string()
  .refine((val) => !val || isValidPhoneNumber(val), {
    message: "Invalid phone number. Use international format (e.g. +41 79 123 45 67)",
  })
  .optional()
  .or(z.literal(""));

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.string().uuid("Invalid role"),
  phone: phoneSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  roleId: z.string().uuid("Invalid role").optional(),
  active: z.boolean().optional(),
  phone: phoneSchema.nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
