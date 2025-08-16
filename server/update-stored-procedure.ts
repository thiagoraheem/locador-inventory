import fs from 'fs';
import path from 'path';
import sql from 'mssql';

import dotenv from 'dotenv';
dotenv.config();

// Configuration for SQL Server connection
const config = {
  server: process.env.DB_SERVER || '54.232.194.197',
  database: process.env.DB_DATABASE || 'inventory',
  user: process.env.DB_USER || 'usrInventory',
  password: process.env.DB_PASSWORD || 'inv@2025',
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
    console.log('🔌 Conectando ao SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'update_sp_RegisterSerialReading.sql');
    console.log(`📄 Lendo arquivo SQL: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`📝 Conteúdo do arquivo carregado (${sqlContent.length} caracteres)`);

    console.log('⚙️ Executando atualização da stored procedure...');
    
    // Split SQL content by GO statements and execute each batch separately
    const batches = sqlContent.split(/\bGO\b/gi).filter(batch => batch.trim().length > 0);
    console.log(`📦 Executando ${batches.length} batches SQL...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`⚙️ Executando batch ${i + 1}/${batches.length}...`);
        const result = await pool.request().query(batch);
        console.log(`✅ Batch ${i + 1} executado com sucesso`);
      }
    }
    
    console.log('✅ Stored procedure sp_RegisterSerialReading atualizada com sucesso!');
    console.log('🔧 Agora a procedure irá incrementar as contagens na tabela inventory_items');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar stored procedure:', error);
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

// Execute the function directly
updateStoredProcedure()
  .then(() => {
    console.log('🎉 Atualização concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro durante a atualização:', error);
    process.exit(1);
  });

export default updateStoredProcedure;