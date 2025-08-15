import type { Express } from "express";
import { getStorage } from "../db";
import { isAuthenticated } from "../auth";
import { insertUserSchema } from "@shared/schema";

export function registerUserRoutes(app: Express) {
  let storage: any;

  // List users
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error as Error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user
  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();

      const userData = { ...req.body };
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema.parse(userDataToValidate);

      const user = await storage.createUser(validatedData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id.toString(),
        oldValues: "",
        newValues: JSON.stringify({ ...validatedData, password: "[REDACTED]" }),
        metadata: "",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
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
      storage = await getStorage();
      const id = req.params.id;
      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const userData = { ...req.body };
      if (!userData.password || userData.password.trim() === "") {
        delete userData.password;
      }
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema.partial().parse(userDataToValidate);
      const user = await storage.updateUser(id, validatedData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: id,
        oldValues: JSON.stringify({ ...oldUser, password: "[REDACTED]" }),
        newValues: JSON.stringify({
          ...validatedData,
          password: validatedData.password ? "[REDACTED]" : undefined,
        }),
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
      storage = await getStorage();
      const id = req.params.id;
      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "DELETE",
        entityType: "USER",
        entityId: id,
        oldValues: JSON.stringify(oldUser),
        newValues: "",
        metadata: "",
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error as Error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}

