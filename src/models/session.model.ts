import mongoose from "mongoose";
const { Schema } = mongoose;
import { thirtyDaysFromNow } from "../utils/dates";

export interface SessionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
    index: true,
  },
  userAgent: { type: String },
  createdAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, default: thirtyDaysFromNow() },
});

const SessionModel = mongoose.model("Session", sessionSchema);
export default SessionModel;
