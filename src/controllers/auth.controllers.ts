import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../utils/catch-async-errors";
import { z } from "zod";
import {
  createAccount,
  loginUser,
  refreshUserAccessToken,
} from "../services/auth.service";
import { CREATED, OK, UNAUTHORIZED } from "../constants/http";
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "../utils/cookies";
import { loginSchema, registerSchema } from "./auth.schema";
import { verifyToken } from "../utils/jwt";
import SessionModel from "../models/session.model";
import appAssert from "../utils/app-assert";

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

export const logoutHandler = catchAsyncErrors(async (req, res, next) => {
  const accessToken = req.cookies.accessToken as string | undefined;
  const { payload } = verifyToken(accessToken || "");
  if (payload) {
    await SessionModel.findByIdAndDelete(payload.sessionId);
  }
  return clearAuthCookies(res)
    .status(OK)
    .json({ message: "Logout successful" });
});

export const refreshHandler = catchAsyncErrors(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken as string | undefined;
  appAssert(refreshToken, UNAUTHORIZED, "Missing refresh token");
  // call refreshUserAccessToken service
  const { accessToken, newRefreshToken } =
    await refreshUserAccessToken(refreshToken);
  // return response
  if (newRefreshToken) {
    res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());
  }
  res
    .status(OK)
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .json({
      message: "Access token refreshed",
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    });
});
