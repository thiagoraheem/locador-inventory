import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/async-handler";
import { logger } from "../utils/logger";

export const login = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const { username, password } = req.body;
  const user = await authService.login(username, password);

  const session = req.session as any;
  session.userId = user.id;

  // Debug logs for login tracking
  logger.debug('User logged in successfully:', user.id, user.username);
  logger.debug('Session userId set to:', session.userId);

  res.json({ user });
});

export const register = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const newUser = await authService.register(req.body);

  const session = req.session as any;
  session.userId = newUser.id;

  res.status(201).json({ user: newUser });
});

export const logout = asyncHandler(async (
  req: Request,
  res: Response,
) => {
  const session = req.session as any;
  await new Promise<void>((resolve, reject) => {
    session.destroy((err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
  res.json({ message: "Logout realizado com sucesso" });
});

export const currentUser = asyncHandler(async (
  req: any,
  res: Response,
) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});
