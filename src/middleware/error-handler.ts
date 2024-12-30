import { z } from "zod";
import { ErrorRequestHandler, Response } from "express";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../constants/http";
import AppError from "../utils/app-error";

const handleZodError = (res: Response, err: z.ZodError) => {
  const errors = err.issues.map((issue) => {
    return { path: issue.path.join("."), message: issue.message };
  });
  res.status(BAD_REQUEST).json({ message: err.message, errors: errors });
};

const handleAppError = (res: Response, err: AppError) => {
  return res
    .status(err.statusCode)
    .json({ message: err.message, errorCode: err.errorCode });
};

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`PATH: ${req.path}`, err);

  if (err instanceof z.ZodError) {
    handleZodError(res, err);
  }

  if (err instanceof AppError) {
    handleAppError(res, err);
  }

  res
    .status(INTERNAL_SERVER_ERROR)
    .json({ message: "Internal Server Error (WDB) from error-handler.ts" });
};

export default errorHandler;
