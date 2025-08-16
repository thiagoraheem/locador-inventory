import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function executeMigration() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    // Conectando ao banco SQL Server
    pool = new sql.ConnectionPool(sqlServerConfig);
    await pool.connect();
    // Conectado com sucesso

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'patrimonio-schema-migration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir em batches separados por GO
    const batches = sqlContent.split(/\n\s*GO\s*\n/);
    const cleanBatches = batches
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    // Executando batches

    for (let i = 0; i < cleanBatches.length; i++) {
      const batch = cleanBatches[i];
      try {
        // Executando batch
        
        const request = pool.request();
        await request.query(batch);
        
        // Batch executado com sucesso
      } catch (batchError: any) {
        // Erro no batch
        
        // Ignorar erros de objetos que já existem
        if (batchError.message.includes('already exists') || 
            batchError.message.includes('já existe') ||
            batchError.message.includes('There is already an object')) {
          // Ignorando erro - objeto já existe
          continue;
        } else {
          throw batchError;
        }
      }
    }

    // Validação pós-migração
    
    // Validar se as tabelas foram criadas
    const tablesCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('inventory_serial_items')
    `);
    
    // Tabelas criadas verificadas
    
    // Validar se as colunas foram adicionadas
    const columnsCheck = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE (TABLE_NAME = 'products' AND COLUMN_NAME = 'hasSerialControl')
      OR (TABLE_NAME = 'inventory_items' AND COLUMN_NAME IN ('serialItemsCount', 'serialItemsFound', 'serialItemsMissing', 'hasSerialDiscrepancy'))
    `);
    
    // Colunas adicionadas verificadas
    
    // Validar índices
    const indexCheck = await pool.request().query(`
      SELECT name 
      FROM sys.indexes 
      WHERE name LIKE 'IX_inventory_serial_items%' 
      OR name = 'IX_products_serial_control'
    `);
    
    // Índices criados verificados
    
    // Validar procedures
    const proceduresCheck = await pool.request().query(`
      SELECT name 
      FROM sys.procedures 
      WHERE name LIKE 'sp_%Serial%'
    `);
    
    // Procedures criadas verificadas
    
    // Verificar produtos com controle de série
    const serialControlCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE hasSerialControl = 1
    `);
    
    // Produtos com controle de série verificados

    // Migração concluída com sucesso
    
  } catch (error: any) {
    // Erro na migração
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      // Conexão fechada
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration();
}

export { executeMigration };