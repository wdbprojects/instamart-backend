import { Router } from "express";
import { registerHandler } from "../controllers/auth.controllers";

const authRoutes = Router();

// prefix: /auth
authRoutes.post("/register", registerHandler);

export default authRoutes;
