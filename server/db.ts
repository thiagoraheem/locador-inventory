
import sql from 'mssql';
import { SimpleStorage } from './simple-storage';

// SQL Server configuration
const {
  DB_SERVER = '54.232.194.197',
  DB_DATABASE = 'inventory',
  DB_USER = 'usrInventory',
  DB_PASSWORD = 'inv@2025',
  NODE_ENV,
} = process.env;

const sqlServerConfig = {
  server: DB_SERVER,
  database: DB_DATABASE,
  user: DB_USER,
  password: DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: NODE_ENV !== 'production',
    connectTimeout: 720000,
    requestTimeout: 720000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let sqlServerPool: sql.ConnectionPool | null = null;
let storage: SimpleStorage | null = null;

export const getSqlServerPool = async () => {
  if (!sqlServerPool) {
    sqlServerPool = new sql.ConnectionPool(sqlServerConfig);
    await sqlServerPool.connect();
    // Connected to SQL Server database
  }
  return sqlServerPool;
};

export const getStorage = async () => {
  if (!storage) {
    const pool = await getSqlServerPool();
    storage = new SimpleStorage(pool);
  }
  return storage;
};
