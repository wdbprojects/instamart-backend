import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verification.code.model";
import VerificationCodeTypes from "../constants/verification-code-types";
import { oneYearFromNow } from "../utils/dates";
import SessionModel from "../models/session.model";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import jwt from "jsonwebtoken";
import appAssert from "../utils/app-assert";
import { CONFLICT } from "../constants/http";

export type CreateAccountType = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userAgent?: string;
};

export const createAccount = async (data: CreateAccountType) => {
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
  const refreshToken = jwt.sign(
    { sessionId: session._id },
    JWT_REFRESH_SECRET,
    { audience: ["user"], expiresIn: "30d" }
  );
  const accessToken = jwt.sign(
    { userId: user._id, sessionId: session._id },
    JWT_SECRET,
    { audience: ["user"], expiresIn: "15m" }
  );
  // 7. return new user and access & refresh tokens
  return {
    user: user.omitPassword(),
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};
