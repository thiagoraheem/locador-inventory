import type { Express } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { loginSchema, registerSchema } from "@shared/schema";
import {
  login,
  register,
  logout,
  currentUser,
} from "../controllers/auth.controller";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", validate(loginSchema), login);

  app.post("/api/auth/register", validate(registerSchema), register);

  app.post("/api/auth/logout", logout);

  app.get("/api/auth/user", isAuthenticated, currentUser);
}

