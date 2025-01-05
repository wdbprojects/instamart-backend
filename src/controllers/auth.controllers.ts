import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../utils/catch-async-errors";
import { z } from "zod";
import {
  createAccount,
  emailVerifyHandlerService,
  loginUser,
  refreshUserAccessToken,
  resetPassword,
  sendPasswordForgotEmail,
} from "../services/auth.service";
import { CREATED, OK, UNAUTHORIZED } from "../constants/http";
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "../utils/cookies";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationCodeSchema,
} from "./auth.schema";
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

export const emailVerifyHandler = catchAsyncErrors(async (req, res, next) => {
  const verificationCode = verificationCodeSchema.parse(req.params.code);
  // call emailVerifyHandlerService service
  const updatedUser = await emailVerifyHandlerService(verificationCode);
  return res.status(OK).json({
    message: "Email verification successfull",
    updatedUser: updatedUser,
  });
});

export const sendPasswordForgotHandler = catchAsyncErrors(
  async (req, res, next) => {
    const email = emailSchema.parse(req.body.email);
    // call sendPasswordForgotEmail service
    await sendPasswordForgotEmail(email);
    return res.status(OK).json({ message: "Password reset email sent" });
  }
);

export const sendPasswordResetHandler = catchAsyncErrors(
  async (req, res, next) => {
    const request = resetPasswordSchema.parse(req.body);
    // call resetPassword service
    await resetPassword(request);
    // return response
    return clearAuthCookies(res)
      .status(OK)
      .json({ message: "Password reset successful" });
  }
);
