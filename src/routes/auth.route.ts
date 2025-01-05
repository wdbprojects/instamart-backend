import { Router } from "express";
import {
  emailVerifyHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  sendPasswordForgotHandler,
  sendPasswordResetHandler,
} from "../controllers/auth.controllers";

const authRoutes = Router();

// prefix: /auth
authRoutes.post("/register", registerHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/email/verify/:code", emailVerifyHandler);
authRoutes.post("/password/forgot", sendPasswordForgotHandler);
authRoutes.post("/password/reset", sendPasswordResetHandler);

export default authRoutes;
