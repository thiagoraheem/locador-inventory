
import sql from 'mssql';
import { SimpleStorage } from './simple-storage';

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

let sqlServerPool: sql.ConnectionPool | null = null;
let storage: SimpleStorage | null = null;

export const getSqlServerPool = async () => {
  if (!sqlServerPool) {
    sqlServerPool = new sql.ConnectionPool(sqlServerConfig);
    await sqlServerPool.connect();
    console.log('Connected to SQL Server database');
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
