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
    console.log('Conectando ao banco SQL Server...');
    pool = new sql.ConnectionPool(sqlServerConfig);
    await pool.connect();
    console.log('Conectado com sucesso!');

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'patrimonio-schema-migration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir em batches separados por GO
    const batches = sqlContent.split(/\n\s*GO\s*\n/);
    const cleanBatches = batches
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Executando ${cleanBatches.length} batches...`);

    for (let i = 0; i < cleanBatches.length; i++) {
      const batch = cleanBatches[i];
      try {
        console.log(`Executando batch ${i + 1}/${cleanBatches.length}...`);
        
        const request = pool.request();
        await request.query(batch);
        
        console.log(`✓ Batch ${i + 1} executado com sucesso`);
      } catch (batchError: any) {
        console.error(`✗ Erro no batch ${i + 1}:`, batchError.message);
        
        // Ignorar erros de objetos que já existem
        if (batchError.message.includes('already exists') || 
            batchError.message.includes('já existe') ||
            batchError.message.includes('There is already an object')) {
          console.log(`⚠ Ignorando erro - objeto já existe`);
          continue;
        } else {
          throw batchError;
        }
      }
    }

    console.log('\n=== VALIDAÇÃO PÓS-MIGRAÇÃO ===');
    
    // Validar se as tabelas foram criadas
    const tablesCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('inventory_serial_items')
    `);
    
    console.log('Tabelas criadas:', tablesCheck.recordset.map(r => r.TABLE_NAME));
    
    // Validar se as colunas foram adicionadas
    const columnsCheck = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE (TABLE_NAME = 'products' AND COLUMN_NAME = 'hasSerialControl')
      OR (TABLE_NAME = 'inventory_items' AND COLUMN_NAME IN ('serialItemsCount', 'serialItemsFound', 'serialItemsMissing', 'hasSerialDiscrepancy'))
    `);
    
    console.log('Colunas adicionadas:', columnsCheck.recordset);
    
    // Validar índices
    const indexCheck = await pool.request().query(`
      SELECT name 
      FROM sys.indexes 
      WHERE name LIKE 'IX_inventory_serial_items%' 
      OR name = 'IX_products_serial_control'
    `);
    
    console.log('Índices criados:', indexCheck.recordset.map(r => r.name));
    
    // Validar procedures
    const proceduresCheck = await pool.request().query(`
      SELECT name 
      FROM sys.procedures 
      WHERE name LIKE 'sp_%Serial%'
    `);
    
    console.log('Procedures criadas:', proceduresCheck.recordset.map(r => r.name));
    
    // Verificar produtos com controle de série
    const serialControlCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE hasSerialControl = 1
    `);
    
    console.log(`Produtos com controle de série: ${serialControlCheck.recordset[0].count}`);

    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error: any) {
    console.error('\n❌ Erro na migração:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexão fechada.');
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration();
}

export { executeMigration };