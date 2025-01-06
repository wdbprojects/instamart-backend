import express from "express";
import cors from "cors";
import cookieParse from "cookie-parser";
import connectDB from "./config/connectDB";
import { APP_ORIGIN, PORT } from "./constants/env";
import errorHandler from "./middleware/error-handler";
import catchAsyncErrors from "./utils/catch-async-errors";
import { OK } from "./constants/http";
import authenticate from "./middleware/authenticate";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import sessionRoutes from "./routes/session.route";

const app = express();

// 1. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: APP_ORIGIN, credentials: true }));
app.use(cookieParse());

// 2. ROUTING
app.get("/", (req, res, next) => {
  res.status(OK).json({ message: "healthy check!" });
});

// AUTH ROUTES
app.use("/auth", authRoutes);
// PROTECTED ROUTES
app.use("/user", authenticate, userRoutes);
// SESSION ROUTES
app.use("/sessions", authenticate, sessionRoutes);

// 3. ERROR HANDLER
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}...`);
    });
  } catch (err: any) {
    console.error(`Error with server: ${err.message}`);
  }
};

startServer();
