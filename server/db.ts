
import { drizzle } from 'drizzle-orm/node-postgres';
import sql from 'mssql';
import * as schema from "@shared/schema";

const config = {
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

let pool: sql.ConnectionPool;

export const getPool = async () => {
  if (!pool) {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
  }
  return pool;
};

// Para compatibilidade com Drizzle, você precisará de um adapter
export const db = drizzle(pool, { schema });
