
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import sql from 'mssql';

// SQL Server configuration
const sqlServerConfig = {
  server: '54.232.194.197',
  database: 'inventory',
  user: 'usrInventory',
  password: 'inv@2025',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 720000,
    requestTimeout: 720000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// For now, use in-memory SQLite
const sqlite = new Database(':memory:');
export const db = drizzle(sqlite, { schema });

// SQL Server pool for raw queries when needed
let sqlServerPool: any = null;

export const getSqlServerPool = async () => {
  if (!sqlServerPool) {
    sqlServerPool = new sql.ConnectionPool(sqlServerConfig);
    await sqlServerPool.connect();
    console.log('Connected to SQL Server database');
  }
  return sqlServerPool;
};
