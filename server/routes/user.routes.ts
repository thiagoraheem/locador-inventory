import type { Express } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/permissions.middleware";
import { userController } from "../controllers/user.controller";

export function registerUserRoutes(app: Express) {
  // List users
  app.get(
    "/api/users",
    isAuthenticated,
    requireRoles(["admin"]),
    userController.list,
  );

  // Create user
  app.post(
    "/api/users",
    isAuthenticated,
    requireRoles(["admin"]),
    userController.create,
  );

  // Update user
  app.put(
    "/api/users/:id",
    isAuthenticated,
    requireRoles(["admin"]),
    userController.update,
  );

  // Delete user
  app.delete(
    "/api/users/:id",
    isAuthenticated,
    requireRoles(["admin"]),
    userController.delete,
  );
}
