import sql from 'mssql';

const config = {
  server: '54.232.194.197',
  database: 'inventory',
  user: 'usrInventory',
  password: 'inv@2025',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkDiscrepanciesHistory() {
  let pool;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!');
    
    // Verificar inventários disponíveis
    console.log('\n📋 Verificando inventários disponíveis...');
    const inventoriesResult = await pool.request().query(`
      SELECT TOP 5 id, code, description, status, createdAt 
      FROM inventories 
      ORDER BY createdAt DESC
    `);
    
    if (inventoriesResult.recordset.length === 0) {
      console.log('❌ Nenhum inventário encontrado');
      return;
    }
    
    console.log('Inventários encontrados:');
    inventoriesResult.recordset.forEach(inv => {
      console.log(`  - ID: ${inv.id}, Código: ${inv.code}, Descrição: ${inv.description}, Status: ${inv.status}`);
    });
    
    const testInventoryId = inventoriesResult.recordset[0].id;
    console.log(`\n🎯 Analisando inventário ID: ${testInventoryId}`);
    
    // Verificar histórico de divergências
    console.log('\n📊 Histórico de divergências:');
    const historyResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          COUNT(*) as total,
          MIN(createdAt) as primeiraCreacao,
          MAX(createdAt) as ultimaCreacao,
          COUNT(DISTINCT CAST(createdAt AS DATE)) as diasComCriacao
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
      `);
    
    const history = historyResult.recordset[0];
    console.log(`Total de divergências: ${history.total}`);
    console.log(`Primeira criação: ${history.primeiraCreacao}`);
    console.log(`Última criação: ${history.ultimaCreacao}`);
    console.log(`Dias com criação: ${history.diasComCriacao}`);
    
    // Verificar divergências por data de criação
    console.log('\n📅 Divergências por data de criação:');
    const byDateResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          CAST(createdAt AS DATE) as dataCriacao,
          COUNT(*) as quantidade,
          MIN(createdAt) as primeiroHorario,
          MAX(createdAt) as ultimoHorario
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        GROUP BY CAST(createdAt AS DATE)
        ORDER BY dataCriacao DESC
      `);
    
    byDateResult.recordset.forEach(row => {
      console.log(`  ${row.dataCriacao.toISOString().split('T')[0]}: ${row.quantidade} divergências (${row.primeiroHorario.toLocaleTimeString()} - ${row.ultimoHorario.toLocaleTimeString()})`);
    });
    
    // Verificar se há duplicatas
    console.log('\n🔍 Verificando possíveis duplicatas:');
    const duplicatesResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          serialNumber,
          COUNT(*) as quantidade
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        GROUP BY serialNumber
        HAVING COUNT(*) > 1
        ORDER BY quantidade DESC
      `);
    
    if (duplicatesResult.recordset.length > 0) {
      console.log('⚠️ Encontradas divergências duplicadas:');
      duplicatesResult.recordset.forEach(row => {
        console.log(`  Serial ${row.serialNumber}: ${row.quantidade} registros`);
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // Verificar status das divergências
    console.log('\n📈 Status das divergências:');
    const statusResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          status,
          COUNT(*) as quantidade
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        GROUP BY status
        ORDER BY quantidade DESC
      `);
    
    statusResult.recordset.forEach(row => {
      console.log(`  ${row.status}: ${row.quantidade}`);
    });
    
    // Verificar tipos de divergências
    console.log('\n🏷️ Tipos de divergências:');
    const typesResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          discrepancyType,
          COUNT(*) as quantidade
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        GROUP BY discrepancyType
        ORDER BY quantidade DESC
      `);
    
    typesResult.recordset.forEach(row => {
      console.log(`  ${row.discrepancyType}: ${row.quantidade}`);
    });
    
    // Verificar se houve processamento recente
    console.log('\n⏰ Verificando processamentos recentes:');
    const recentResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT TOP 10
          serialNumber,
          discrepancyType,
          createdAt,
          status
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        ORDER BY createdAt DESC
      `);
    
    console.log('Últimas 10 divergências criadas:');
    recentResult.recordset.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.serialNumber} (${row.discrepancyType}) - ${row.createdAt.toLocaleString()} - ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

checkDiscrepanciesHistory();