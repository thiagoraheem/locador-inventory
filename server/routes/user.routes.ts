import type { Express } from "express";
import { isAuthenticated } from "../auth";
import { insertUserSchema } from "@shared/schema";
import { userService } from "../services/user.service";

export function registerUserRoutes(app: Express) {

  // List users
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error as Error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user
  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userData = { ...req.body };
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema.parse(userDataToValidate);

      const user = await userService.createUser(
        validatedData,
        req.user.id,
      );

      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error as Error);
      res.status(500).json({
        message: "Failed to create user",
        details: (error as Error).message,
      });
    }
  });

  // Update user
  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;

      const userData = { ...req.body };
      if (!userData.password || userData.password.trim() === "") {
        delete userData.password;
      }
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema.partial().parse(userDataToValidate);

      const user = await userService.updateUser(
        id,
        validatedData,
        req.user.id,
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error as Error);
      res.status(500).json({
        message: "Failed to update user",
        details: (error as Error).message,
      });
    }
  });

  // Delete user
  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const success = await userService.deleteUser(id, req.user.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error as Error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}

