import type { RequestHandler } from "express";
import { getStorage } from "../db";

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;

  console.log('DEBUG: Auth middleware - session:', session);
  console.log('DEBUG: Auth middleware - session.userId:', session.userId);

  if (!session.userId) {
    console.log('DEBUG: Auth middleware - No userId in session, returning 401');
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Verify user still exists and is active
    const storage = await getStorage();
    const user = await storage.getUser(Number(session.userId));

    console.log('DEBUG: Auth middleware - User found:', user ? user.id : 'null');

    if (!user || !user.isActive) {
      console.log('DEBUG: Auth middleware - User not found or inactive, clearing session');
      // Clear invalid session
      session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request
    (req as any).user = user;
    console.log('DEBUG: Auth middleware - User authenticated successfully:', user.id);
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
