import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../utils/catch-async-errors";
import { z } from "zod";
import { createAccount, loginUser } from "../services/auth.service";
import { CREATED, OK } from "../constants/http";
import { setAuthCookies } from "../utils/cookies";
import { loginSchema, registerSchema } from "./auth.schema";

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

export const loginHandler = catchAsyncErrors(async (req, res) => {
  // 1. validate request
  const request = loginSchema.parse({
    ...req.body,
    userAgent: req.headers["user-agent"],
  });
  // 2. call service
  const { accessToken, refreshToken } = await loginUser(request);
  // 3. return response
  return setAuthCookies({
    res: res,
    accessToken: accessToken,
    refreshToken: refreshToken,
  })
    .status(OK)
    .json({ message: "Login successful" });
});
