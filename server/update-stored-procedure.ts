import fs from 'fs';
import path from 'path';
import sql from 'mssql';

// Configuration for SQL Server connection
const config = {
  server: process.env.DB_HOST || 'SRVLOCADOR\\MSSQLSERVER2019',
  database: process.env.DB_NAME || 'inventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Vasco!23',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 60000,
    requestTimeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

  async function updateStoredProcedure() {
    let pool: sql.ConnectionPool | null = null;
  
  try {
    // Conectando ao SQL Server
    pool = await sql.connect(config);
    // Conectado com sucesso

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'update_sp_RegisterSerialReading.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Executando atualização da stored procedure
    
    // Execute the SQL to update the stored procedure
    await pool.request().query(sqlContent);
    
    // Stored procedure sp_RegisterSerialReading atualizada com sucesso
    // Agora a procedure irá incrementar as contagens na tabela inventory_items
    
  } catch (error) {
    // Erro ao atualizar stored procedure
    process.exit(1);
  } finally {
      if (pool) {
        await pool.close();
      }
  }
}

// Execute if run directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  updateStoredProcedure()
    .then(() => {
      // Atualização concluída com sucesso
      process.exit(0);
    })
    .catch((error) => {
      // Falha na atualização
      process.exit(1);
    });
}

export default updateStoredProcedure;