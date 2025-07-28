import sql from 'mssql';

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
  }
};

async function removeUnnecessaryTables() {
  console.log('🔗 Conectando ao SQL Server...');
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('✅ Conectado com sucesso!');

  // Remover tabelas que não precisam mais ser congeladas
  const dropSQL = `
    -- Drop unnecessary snapshot tables
    IF OBJECT_ID('inventory_categories_snapshot', 'U') IS NOT NULL DROP TABLE inventory_categories_snapshot;
    IF OBJECT_ID('inventory_companies_snapshot', 'U') IS NOT NULL DROP TABLE inventory_companies_snapshot;
    IF OBJECT_ID('inventory_locations_snapshot', 'U') IS NOT NULL DROP TABLE inventory_locations_snapshot;
    IF OBJECT_ID('inventory_products_snapshot', 'U') IS NOT NULL DROP TABLE inventory_products_snapshot;
    
    SELECT 'Unnecessary snapshot tables removed successfully' as result;
  `;

  console.log('🗑️ Removendo tabelas snapshot desnecessárias...');
  try {
    await pool.request().query(dropSQL);
    console.log('✅ Tabelas removidas com sucesso!');
    
    // Verificar tabelas restantes
    console.log('\n📋 Verificando tabelas snapshot restantes...');
    const checkResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE '%snapshot%' 
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tabelas snapshot ativas:');
    checkResult.recordset.forEach(row => console.log(`   ✓ ${row.TABLE_NAME}`));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  await pool.close();
  console.log('\n🎯 Processo finalizado!');
}

removeUnnecessaryTables().catch(console.error);
