import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../utils/catch-async-errors";
import { z } from "zod";
import { createAccount } from "../services/auth.service";
import { CREATED } from "../constants/http";
import { setAuthCookies } from "../utils/cookies";

const registerSchema = z
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

export const registerHandler = catchAsyncErrors(async (req, res, next) => {
  // 1. validate request
  const request = registerSchema.parse({
    ...req.body,
    userAgent: req.headers["user-agent"],
  });
  // 2. call service
  const { user, accessToken, refreshToken } = await createAccount(request);
  // 3. return response
  return setAuthCookies({ res, accessToken, refreshToken })
    .status(CREATED)
    .json({ user: user });
});
