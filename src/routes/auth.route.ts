import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from "../controllers/auth.controllers";

const authRoutes = Router();

// prefix: /auth
authRoutes.post("/register", registerHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/refresh", refreshHandler);

export default authRoutes;
