import { getStorage } from './server/db.js';

async function testSerialDiscrepanciesData() {
  try {
    const storage = await getStorage();
    
    console.log('\n=== Verificando tabela inventory_serial_discrepancies ===');
    
    // 1. Verificar se a tabela existe
    const tableExistsQuery = `
      SELECT COUNT(*) as tableExists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'inventory_serial_discrepancies'
    `;
    
    const tableResult = await storage.pool.request().query(tableExistsQuery);
    const tableExists = tableResult.recordset[0].tableExists > 0;
    
    console.log(`Tabela existe: ${tableExists ? 'SIM' : 'NÃO'}`);
    
    if (!tableExists) {
      console.log('❌ Tabela inventory_serial_discrepancies não existe!');
      console.log('Execute o script sql/serial-discrepancies-schema.sql primeiro.');
      return;
    }
    
    // 2. Verificar total de registros
    const totalQuery = `SELECT COUNT(*) as total FROM inventory_serial_discrepancies`;
    const totalResult = await storage.pool.request().query(totalQuery);
    const totalRecords = totalResult.recordset[0].total;
    
    console.log(`Total de registros na tabela: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('⚠️  Tabela está vazia. Execute o processamento de divergências primeiro.');
      
      // Verificar inventários disponíveis
      const inventoriesQuery = `
        SELECT TOP 5 Id, Name, Status 
        FROM inventories 
        ORDER BY CreatedAt DESC
      `;
      const inventoriesResult = await storage.pool.request().query(inventoriesQuery);
      
      console.log('\nInventários disponíveis:');
      inventoriesResult.recordset.forEach(inv => {
        console.log(`- ID: ${inv.Id}, Nome: ${inv.Name}, Status: ${inv.Status}`);
      });
      
      return;
    }
    
    // 3. Verificar registros por inventário
    const byInventoryQuery = `
      SELECT 
        inventoryId,
        COUNT(*) as total,
        COUNT(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 END) as locationMismatch,
        COUNT(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 END) as notFound,
        COUNT(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 END) as unexpectedFound,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved
      FROM inventory_serial_discrepancies
      GROUP BY inventoryId
      ORDER BY inventoryId DESC
    `;
    
    const byInventoryResult = await storage.pool.request().query(byInventoryQuery);
    
    console.log('\nDivergências por inventário:');
    byInventoryResult.recordset.forEach(record => {
      console.log(`\nInventário ID: ${record.inventoryId}`);
      console.log(`  Total: ${record.total}`);
      console.log(`  Local Diferente: ${record.locationMismatch}`);
      console.log(`  Não Encontrados: ${record.notFound}`);
      console.log(`  Inesperados: ${record.unexpectedFound}`);
      console.log(`  Pendentes: ${record.pending}`);
      console.log(`  Resolvidos: ${record.resolved}`);
    });
    
    // 4. Mostrar alguns registros de exemplo
    const sampleQuery = `
      SELECT TOP 5 
        id,
        inventoryId,
        serialNumber,
        productSku,
        productName,
        discrepancyType,
        status,
        expectedLocationName,
        foundLocationName,
        createdAt
      FROM inventory_serial_discrepancies
      ORDER BY createdAt DESC
    `;
    
    const sampleResult = await storage.pool.request().query(sampleQuery);
    
    console.log('\nExemplos de registros:');
    sampleResult.recordset.forEach(record => {
      console.log(`\nID: ${record.id}`);
      console.log(`  Inventário: ${record.inventoryId}`);
      console.log(`  Série: ${record.serialNumber}`);
      console.log(`  Produto: ${record.productName} (${record.productSku})`);
      console.log(`  Tipo: ${record.discrepancyType}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Local Esperado: ${record.expectedLocationName || 'N/A'}`);
      console.log(`  Local Encontrado: ${record.foundLocationName || 'N/A'}`);
      console.log(`  Criado: ${record.createdAt}`);
    });
    
    // 5. Testar endpoint de resumo
    console.log('\n=== Testando endpoint de resumo ===');
    
    const firstInventoryId = byInventoryResult.recordset[0]?.inventoryId;
    if (firstInventoryId) {
      try {
        const summary = await storage.getSerialDiscrepanciesSummary(firstInventoryId);
        console.log(`Resumo para inventário ${firstInventoryId}:`);
        console.log(JSON.stringify(summary, null, 2));
      } catch (error) {
        console.error('Erro ao buscar resumo:', error.message);
      }
    }
    
    // 6. Testar endpoint de listagem
    console.log('\n=== Testando endpoint de listagem ===');
    
    if (firstInventoryId) {
      try {
        const discrepancies = await storage.getSerialDiscrepancies({
          inventoryId: firstInventoryId,
          page: 1,
          limit: 5
        });
        console.log(`Listagem para inventário ${firstInventoryId}:`);
        console.log(`Total: ${discrepancies.total}`);
        console.log(`Página: ${discrepancies.page}`);
        console.log(`Registros retornados: ${discrepancies.discrepancies?.length || discrepancies.items?.length || 0}`);
      } catch (error) {
        console.error('Erro ao buscar listagem:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

testSerialDiscrepanciesData();