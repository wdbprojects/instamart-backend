import { Router } from "express";
import {
  deleteSessionsHandler,
  getSessionsHandler,
} from "../controllers/session.controller";

const sessionRoutes = Router();

// prefix: /user
sessionRoutes.get("/", getSessionsHandler);
sessionRoutes.delete("/:id", deleteSessionsHandler);

export default sessionRoutes;
