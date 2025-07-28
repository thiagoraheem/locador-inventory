import sql from 'mssql';
import { fileURLToPath } from 'url';
import path from 'path';

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

async function investigateDatabase() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Conectando ao banco SQL Server...');
    pool = new sql.ConnectionPool(sqlServerConfig);
    await pool.connect();
    console.log('Conectado com sucesso!');

    // Investigar todas as tabelas
    console.log('\n=== TABELAS NO BANCO ===');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE 
      FROM INFORMATION_SCHEMA.TABLES 
      ORDER BY TABLE_TYPE, TABLE_NAME
    `);
    
    console.log('Tabelas encontradas:');
    tables.recordset.forEach(table => {
      console.log(`- ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
    });

    // Investigar estrutura das tabelas relevantes
    const relevantTables = ['products', 'inventory_items', 'stock_items', 'inventories', 'locations', 'users'];
    
    for (const tableName of relevantTables) {
      console.log(`\n=== ESTRUTURA DA TABELA/VIEW: ${tableName.toUpperCase()} ===`);
      
      try {
        // Verificar se é tabela ou view
        const tableType = await pool.request().query(`
          SELECT TABLE_TYPE 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = '${tableName}'
        `);
        
        if (tableType.recordset.length > 0) {
          console.log(`Tipo: ${tableType.recordset[0].TABLE_TYPE}`);
          
          // Listar colunas
          const columns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${tableName}'
            ORDER BY ORDINAL_POSITION
          `);
          
          console.log('Colunas:');
          columns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
          });
          
          // Se for view, mostrar definição
          if (tableType.recordset[0].TABLE_TYPE === 'VIEW') {
            try {
              const viewDef = await pool.request().query(`
                SELECT VIEW_DEFINITION 
                FROM INFORMATION_SCHEMA.VIEWS 
                WHERE TABLE_NAME = '${tableName}'
              `);
              console.log('Definição da View:');
              console.log(viewDef.recordset[0].VIEW_DEFINITION);
            } catch (error) {
              console.log('Não foi possível obter a definição da view');
            }
          }
        } else {
          console.log(`❌ Tabela/View '${tableName}' não encontrada`);
        }
      } catch (error: any) {
        console.log(`❌ Erro ao investigar '${tableName}':`, error.message);
      }
    }

    // Verificar se há tabelas base
    console.log('\n=== TABELAS BASE (não views) ===');
    const baseTables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('Tabelas base encontradas:');
    baseTables.recordset.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });

    // Investigar stock_items mais detalhadamente
    console.log('\n=== ANÁLISE ESPECÍFICA DE STOCK_ITEMS ===');
    try {
      const stockItemsData = await pool.request().query(`
        SELECT TOP 5 * FROM stock_items
      `);
      
      console.log('Primeiros 5 registros de stock_items:');
      console.log(stockItemsData.recordset);
      
      const serialCount = await pool.request().query(`
        SELECT COUNT(*) as total, 
               COUNT(serialNumber) as withSerial,
               COUNT(CASE WHEN serialNumber IS NOT NULL AND serialNumber != '' THEN 1 END) as withValidSerial
        FROM stock_items
      `);
      
      console.log('Estatísticas de números de série:');
      console.log(serialCount.recordset[0]);
      
    } catch (error: any) {
      console.log('Erro ao analisar stock_items:', error.message);
    }

    console.log('\n=== FIM DA INVESTIGAÇÃO ===');
    
  } catch (error: any) {
    console.error('\n❌ Erro na investigação:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexão fechada.');
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateDatabase();
}

export { investigateDatabase };