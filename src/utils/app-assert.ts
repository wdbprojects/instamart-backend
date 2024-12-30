import assert from "node:assert";
import AppError from "./app-error";
import { HttpStatusCode } from "../constants/http";
import AppErrorCode from "../constants/app-error-code";

type AppAssertTypes = (
  condition: any,
  httpStatusCode: HttpStatusCode,
  message: any,
  appErrorCode?: AppErrorCode
) => asserts condition;

/* Asserts a condition and throws an AppError if the condition is falsy */

const appAssert: AppAssertTypes = (
  condition,
  httpStatusCode,
  message,
  appErrorCode
) => {
  return assert(condition, new AppError(httpStatusCode, message, appErrorCode));
};

export default appAssert;
