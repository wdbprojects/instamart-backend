import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verification.code.model";
import VerificationCodeTypes from "../constants/verification-code-types";
import {
  NOW,
  ON_DAY_MS,
  oneYearFromNow,
  thirtyDaysFromNow,
} from "../utils/dates";
import SessionModel from "../models/session.model";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import jwt from "jsonwebtoken";
import appAssert from "../utils/app-assert";
import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";

/* REGISTER SERVIE */

export type CreateAccountParams = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userAgent?: string;
};

export const createAccount = async (data: CreateAccountParams) => {
  // 1. verify that user with email exists
  const existingUser = await UserModel.exists({ email: data.email });
  appAssert(!existingUser, CONFLICT, "Email already in use (appAssert)");

  // 2. create user
  const user = await UserModel.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
  });
  // 3. create verification code
  const verificationCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeTypes.EmailVerification,
    expiresAt: oneYearFromNow(),
  });
  // 4. send verification email
  // 5. create session in system
  const session = await SessionModel.create({
    userId: user._id,
    userAgent: data.userAgent,
  });
  // 6. sign access & refresh token
  const sessionInfo = { sessionId: session._id };
  const refreshToken = signToken(sessionInfo, refreshTokenSignOptions);
  const accessToken = signToken({ ...sessionInfo, userId: user._id });

  // 7. return new user and access & refresh tokens
  return {
    user: user.omitPassword(),
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};

/* LOGIN SERVIE */

export type LoginAccountParams = {
  email: string;
  password: string;
  userAgent?: string;
};

export const loginUser = async ({
  email,
  password,
  userAgent,
}: LoginAccountParams) => {
  // 1. verify that user with email exists
  const user = await UserModel.findOne({ email: email });
  appAssert(user, UNAUTHORIZED, "Invalid email or password");
  // 2. validate password
  const passwordIsValid = await user.comparePassword(password);
  appAssert(passwordIsValid, UNAUTHORIZED, "Invalid email or password");
  // 3. create session
  const userId = user._id;
  const session = await SessionModel.create({
    userId: userId,
    userAgent: userAgent,
  });
  // 4. sign access & refresh token
  const sessionInfo = { sessionId: session._id };
  const refreshToken = signToken(sessionInfo, refreshTokenSignOptions);
  const accessToken = signToken({ ...sessionInfo, userId: user._id });

  // 7. return new user and access & refresh tokens
  return {
    user: user.omitPassword(),
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};

export const refreshUserAccessToken = async (refreshToken: string) => {
  // 1. validate refresh token
  const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });
  appAssert(payload, UNAUTHORIZED, "Invalid refresh token");
  // 2. get the session
  const session = await SessionModel.findById(payload.sessionId);
  appAssert(
    session && session.expiresAt.getTime() > NOW,
    UNAUTHORIZED,
    "Session expired"
  );
  // 3. id session is about to expire, increase its expiration date (better user experience)
  // refresh session if it expires within the next 24 hours
  const sessionNeedsRefresh = session.expiresAt.getTime() - NOW <= ON_DAY_MS;
  if (sessionNeedsRefresh) {
    session.expiresAt = thirtyDaysFromNow();
    await session.save();
  }
  // 4. sign new refresh token
  const newRefreshToken = sessionNeedsRefresh
    ? signToken({ sessionId: session._id }, refreshTokenSignOptions)
    : undefined;

  // 5. sign new access token
  const accessToken = signToken({
    userId: session.userId,
    sessionId: session._id,
  });

  // 6. return tokens
  return { accessToken: accessToken, newRefreshToken: newRefreshToken };
};
