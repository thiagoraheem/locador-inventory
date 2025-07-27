import { SimpleStorage } from './simple-storage';

async function investigateStockItems() {
  try {
    const storage = new SimpleStorage();
    await storage.init();
    const pool = (storage as any).pool;

    console.log('\n=== INVESTIGANDO TABELAS ===');
    
    // Check if stock_items table/view exists
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'stock_items'
    `);
    
    if (tablesResult.recordset.length === 0) {
      console.log('Tabela stock_items não encontrada');
      
      // Check for similar tables
      const similarTablesResult = await pool.request().query(`
        SELECT TABLE_NAME, TABLE_TYPE 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%stock%' OR TABLE_NAME LIKE '%item%' OR TABLE_NAME LIKE '%patrimonio%'
        ORDER BY TABLE_NAME
      `);
      
      console.log('\n=== TABELAS SIMILARES ===');
      for (const table of similarTablesResult.recordset) {
        console.log(`${table.TABLE_TYPE}: ${table.TABLE_NAME}`);
      }
    } else {
      console.log('Tabela stock_items encontrada:', tablesResult.recordset[0]);
      
      // Get column structure
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'stock_items'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('\n=== ESTRUTURA stock_items ===');
      for (const column of columnsResult.recordset) {
        console.log(`${column.COLUMN_NAME}: ${column.DATA_TYPE} ${column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    }

    // Check products table structure
    const productsColumnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n=== ESTRUTURA products ===');
    for (const column of productsColumnsResult.recordset) {
      console.log(`${column.COLUMN_NAME}: ${column.DATA_TYPE}`);
    }

    // Sample data from products
    const sampleProductsResult = await pool.request().query('SELECT TOP 3 * FROM products');
    console.log('\n=== SAMPLE products ===');
    console.log(JSON.stringify(sampleProductsResult.recordset[0], null, 2));

    await pool.close();
  } catch (error) {
    console.error('Erro na investigação:', error);
  }
}

investigateStockItems();