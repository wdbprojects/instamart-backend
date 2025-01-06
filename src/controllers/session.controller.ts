import { z } from "zod";
import { NOT_FOUND, OK } from "../constants/http";
import SessionModel from "../models/session.model";
import appAssert from "../utils/app-assert";
import catchAsyncErrors from "../utils/catch-async-errors";

export const getSessionsHandler = catchAsyncErrors(async (req, res, next) => {
  const sessions = await SessionModel.find(
    {
      userId: req.userId,
      expiresAt: { $gt: new Date() },
    },
    { _id: 1, userAgent: 1, createdAt: 1 },
    { sort: { createdAt: -1 } }
  );
  appAssert(sessions, NOT_FOUND, "No sessions found");
  res.status(OK).json(
    sessions.map((session) => {
      return {
        ...session.toObject(),
        ...(session.id === req.sessionId && { isCurrent: true }),
      };
    })
  );
});

export const deleteSessionsHandler = catchAsyncErrors(
  async (req, res, next) => {
    const sessionId = z.string().parse(req.params.id);
    const deletedSession = await SessionModel.findOneAndDelete({
      _id: sessionId,
      userId: req.userId,
    });
    appAssert(deletedSession, NOT_FOUND, "Session not found");
    res.status(OK).json({ message: "session removed!" });
  }
);
