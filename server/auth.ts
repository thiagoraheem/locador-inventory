import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import { getStorage } from "./db";
import { loginSchema, registerSchema } from "@shared/schema";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStoreSession = MemoryStore(session);

  // Generate a secure session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || 'As/uEgJuzwRP7JcjDoNcVY41F75KCSNg/c9jew8VIzQ=';

  return session({
    secret: sessionSecret,
    store: new MemoryStoreSession({
      checkPeriod: sessionTtl // prune expired entries every 1 week
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;

  if (!session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Verify user still exists and is active
    const storage = await getStorage();
    const user = await storage.getUser(session.userId);
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

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}