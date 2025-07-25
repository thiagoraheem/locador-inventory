import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import { storage } from "./storage";
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

export async function createDefaultAdmin() {
  try {
    // Create default admin user if none exists
    const users = await storage.getUsers();
    const adminUser = users.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.log('No admin user found, creating default admin...');
      const hashedPassword = await hashPassword('admin123');
      const newAdmin = await storage.createUser({
        id: 'admin-' + Date.now(),
        username: 'admin',
        email: 'admin@inventory.com',
        password: hashedPassword,
        firstName: 'Administrator',
        lastName: 'User',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Default admin user created successfully:', {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role
      });
      console.log('🔑 Login credentials: admin/admin123');
    } else {
      console.log('✅ Admin user already exists:', {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive
      });
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
}