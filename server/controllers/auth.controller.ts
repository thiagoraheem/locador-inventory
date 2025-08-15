import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;
    const user = await authService.login(username, password);

    const session = req.session as any;
    session.userId = user.id;

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const newUser = await authService.register(req.body);

    const session = req.session as any;
    session.userId = newUser.id;

    res.status(201).json({ user: newUser });
  } catch (error) {
    next(error);
  }
}

export function logout(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  session.destroy((err: any) => {
    if (err) {
      return next(err);
    }
    res.json({ message: "Logout realizado com sucesso" });
  });
}

export async function currentUser(req: any, res: Response, next: NextFunction) {
  try {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}
