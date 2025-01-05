import { NOT_FOUND, OK } from "../constants/http";
import UserModel from "../models/user.model";
import appAssert from "../utils/app-assert";
import catchAsyncErrors from "../utils/catch-async-errors";

export const getUserHandler = catchAsyncErrors(async (req, res, next) => {
  const user = await UserModel.findById(req.userId);
  appAssert(user, NOT_FOUND, "User not found");
  res.status(OK).json({ user: user.omitPassword() });
});
