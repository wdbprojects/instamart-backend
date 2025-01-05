import { z } from "zod";

export const emailSchema = z.string().email().min(1).max(255);
export const passwordSchema = z.string().min(8).max(255);

export const registerSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email("Must provide a valid email"),
    password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(24, { message: "Max 24 characters" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(24, { message: "Max 24 characters" }),
    userAgent: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Must provide a valid email"),
  password: z.string().min(1, { message: "Password is a required field" }),
  userAgent: z.string().optional(),
});

export const verificationCodeSchema = z.string().min(1).max(24);

export const resetPasswordSchema = z.object({
  password: z.string().min(1).min(8).max(24),
  verificationCode: verificationCodeSchema,
});
