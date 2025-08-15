import { Request, Response } from "express";
import { insertUserSchema } from "@shared/schema";
import { userService } from "../services/user.service";
import { asyncHandler } from "../utils/async-handler";

export class UserController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.json(users);
  });

  create = asyncHandler(async (req: any, res: Response) => {
    const { confirmPassword, ...userData } = req.body || {};
    const validatedData = insertUserSchema.parse(userData);
    const user = await userService.createUser(validatedData, req.user.id);
    res.status(201).json(user);
  });

  update = asyncHandler(async (req: any, res: Response) => {
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
  });

  delete = asyncHandler(async (req: any, res: Response) => {
    const id = req.params.id;
    const success = await userService.deleteUser(id, req.user.id);
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).send();
  });
}

export const userController = new UserController();
