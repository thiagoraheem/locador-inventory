import { Request, Response, NextFunction } from "express";
import { insertUserSchema } from "@shared/schema";
import { userService } from "../services/user.service";

export class UserController {
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { confirmPassword, ...userData } = req.body || {};
      const validatedData = insertUserSchema.parse(userData);
      const user = await userService.createUser(validatedData, req.user.id);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: any, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const { confirmPassword, ...userData } = req.body || {};
      if (!userData.password || userData.password.trim() === "") {
        delete userData.password;
      }
      const validatedData = insertUserSchema.partial().parse(userData);
      const user = await userService.updateUser(id, validatedData, req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: any, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const success = await userService.deleteUser(id, req.user.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
