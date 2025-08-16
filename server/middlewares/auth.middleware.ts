import type { RequestHandler } from "express";
import { getStorage } from "../db";

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;

  if (!session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Verify user still exists and is active
    const storage = await getStorage();
    const user = await storage.getUser(Number(session.userId));

    if (!user || !user.isActive) {
      // Clear invalid session
      session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
