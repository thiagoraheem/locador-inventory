import bcrypt from "bcrypt";
import session from "express-session";
import type { Express } from "express";
import MemoryStore from "memorystore";
// TODO: Implement SQL Server session store after testing
// import MSSQLStore from "connect-mssql-v2";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStoreSession = MemoryStore(session);

  // SESSION_SECRET must be provided and rotated periodically
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  return session({
    secret: sessionSecret,
    store: new MemoryStoreSession({
      checkPeriod: sessionTtl, // prune expired entries every 1 week
      max: 1000, // Limit number of sessions
      dispose: (key: string) => {
        // Session disposed
      },
    }),
    resave: false,
    saveUninitialized: false,
    name: 'inventory.sid', // Unique session name to avoid conflicts
    cookie: {
      httpOnly: true,
      secure: false, // Disable secure for localhost testing
      maxAge: sessionTtl,
      sameSite: 'lax', // Prevent CSRF attacks
      domain: undefined, // Don't share across subdomains
    },
  });

  // TODO: SQL Server session store implementation
  /*
  const storeConfig = {
    server: process.env.DB_SERVER || 'SRVLOCADOR\\MSSQLSERVER2019',
    database: process.env.DB_DATABASE || 'inventory',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Vasco!23',
    table: 'sessions',
    ttl: sessionTtl,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  };

  return session({
    secret: sessionSecret,
    store: new MSSQLStore(storeConfig),
    resave: false,
    saveUninitialized: false,
    name: 'inventory.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
      domain: undefined,
    },
  });
  */
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}