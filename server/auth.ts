import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Generate a secure session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || 'As/uEgJuzwRP7JcjDoNcVY41F75KCSNg/c9jew8VIzQ=';
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
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

  // Verify user still exists and is active
  const user = await storage.getUser(session.userId);
  if (!user || !user.isActive) {
    // Clear invalid session
    session.destroy(() => {});
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request
  (req as any).user = user;
  next();
};

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function createDefaultAdmin() {
  // Create default admin user if none exists
  storage.getUsers().then(async (users) => {
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) {
      const hashedPassword = await hashPassword('admin123');
      await storage.createUser({
        id: 'admin-' + Date.now(),
        username: 'admin',
        email: 'admin@inventory.com',
        password: hashedPassword,
        firstName: 'Administrator',
        lastName: 'User',
        role: 'admin',
        isActive: true,
      });
      console.log('Default admin user created: admin/admin123');
    }
  }).catch(console.error);
}