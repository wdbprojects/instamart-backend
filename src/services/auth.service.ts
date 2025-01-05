import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verification.code.model";
import VerificationCodeTypes from "../constants/verification-code-types";
import {
  fiveMinutesAgo,
  NOW,
  ON_DAY_MS,
  oneHourFromNow,
  oneYearFromNow,
  thirtyDaysFromNow,
} from "../utils/dates";
import SessionModel from "../models/session.model";
import { APP_ORIGIN } from "../constants/env";
import appAssert from "../utils/app-assert";
import {
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../constants/http";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";
import { sendMail } from "../utils/send-mail";
import {
  getPasswordResetTemplate,
  getVerifyEmailTemplate,
} from "../utils/email-templates";
import { hashValue } from "../utils/bcrypt";

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

  const url = `${APP_ORIGIN}/email/verify/${verificationCode._id}`;
  const test = await sendMail({
    to: user.email,
    ...getVerifyEmailTemplate(url),
  });
  console.log("TEST: ", test);

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

export const emailVerifyHandlerService = async (code: string) => {
  // 1. get verification code
  const validCode = await VerificationCodeModel.findOne({
    _id: code,
    type: VerificationCodeTypes.EmailVerification,
    expiresAt: { $gt: new Date() },
  });
  appAssert(validCode, UNAUTHORIZED, "Invalid verification code");
  // 2. update user to verified = true (if user exists)
  const updatedUser = await UserModel.findByIdAndUpdate(
    validCode.userId,
    {
      verified: true,
    },
    { new: true }
  );
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to verify email");
  // 4. delete verification code
  await validCode.deleteOne();
  // 5. return updated user
  return { updatedUser: updatedUser.omitPassword() };
};

export const sendPasswordForgotEmail = async (email: string) => {
  // 1. get user by email
  const user = await UserModel.findOne({ email: email });
  appAssert(user, NOT_FOUND, "User not found");
  // 2. check email rate limit
  const fiveMinAgo = fiveMinutesAgo();
  const count = await VerificationCodeModel.countDocuments({
    userId: user._id,
    type: VerificationCodeTypes.PasswordReset,
    createdAt: { $gt: fiveMinAgo },
  });
  appAssert(
    count <= 1,
    TOO_MANY_REQUESTS,
    "Rate limit exceeded, try again in 5 minutes"
  );
  // 3. create verification code
  const expiresAt = oneHourFromNow();
  const verificationCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeTypes.PasswordReset,
    expiresAt: expiresAt,
  });
  // 4. send verification email
  const url = `${APP_ORIGIN}/password/reset?code=${verificationCode._id}&exp=${expiresAt.getTime()}`;

  const { data, error } = await sendMail({
    to: user.email,
    ...getPasswordResetTemplate(url),
  });
  appAssert(data?.id, INTERNAL_SERVER_ERROR, "Failed to send email");

  // 5. return response
  return { url: url, email: data.id };
};

type ResetPasswordParams = {
  password: string;
  verificationCode: string;
};
export const resetPassword = async ({
  password,
  verificationCode,
}: ResetPasswordParams) => {
  // 1. get verification code
  const validCode = await VerificationCodeModel.findOne({
    _id: verificationCode,
    type: VerificationCodeTypes.PasswordReset,
    expiresAt: { $gt: new Date() },
  });
  appAssert(validCode, NOT_FOUND, "Invalid or expired verification code");
  // 2. update user password
  const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, {
    password: await hashValue(password),
  });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to reset password");
  // 3. delete verification code
  await validCode.deleteOne();
  // 4. delete all sessions
  await SessionModel.deleteMany({ userId: validCode.userId });
  // 5. return updated user (omitting password)
  return { updatedUser: updatedUser.omitPassword() };
};
