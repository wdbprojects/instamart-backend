import { Response, CookieOptions } from "express";
import { NODE_ENV } from "../constants/env";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "./dates";

type CookieParams = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

const secure = NODE_ENV !== "development";

const defaults: CookieOptions = {
  sameSite: "strict",
  httpOnly: true,
  secure: secure,
};

const getAccessTokenCookieOptions = (): CookieOptions => {
  return { ...defaults, expires: fifteenMinutesFromNow() };
};

const getRefreshTokenCookieOptions = (): CookieOptions => {
  return { ...defaults, expires: thirtyDaysFromNow(), path: "/auth/refresh" };
};

export const setAuthCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookieParams) => {
  return res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
};
