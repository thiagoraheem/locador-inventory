import { getStorage } from './server/db.ts';

// Função para testar criação de registros com divergência de localização
async function testLocationDiscrepancy() {
  try {
    console.log('=== Teste de Divergência de Localização ===');
    
    const storage = await getStorage();
    
    // Verificar registros antes do teste
    console.log('\n1. Verificando registros existentes para serial 002606...');
    const beforeRecords = await storage.pool.request()
      .input('serialNumber', 'NVARCHAR', '002606')
      .query(`
        SELECT id, serialNumber, locationId, status, createdAt, 
               count1_found, count2_found, count3_found, count4_found
        FROM inventory_serial_items 
        WHERE serialNumber = @serialNumber
        ORDER BY createdAt DESC
      `);
    
    console.log(`Registros encontrados: ${beforeRecords.recordset.length}`);
    beforeRecords.recordset.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, LocationId: ${record.locationId}, Status: ${record.status}`);
      console.log(`     Count1: ${record.count1_found}, Count2: ${record.count2_found}, Count3: ${record.count3_found}`);
    });
    
    // Fazer uma requisição de teste via API
    console.log('\n2. Fazendo requisição de teste via API...');
    const testData = {
      serialNumber: '002606',
      countStage: 'count3',
      scannedLocationId: 4 // Local diferente para forçar divergência
    };
    
    console.log('Dados da requisição:', testData);
    
    // Simular a chamada da API
    const result = await storage.registerSerialReading(
      35, // inventoryId
      testData,
      1 // userId
    );
    
    console.log('Resultado da API:', result);
    
    // Verificar registros após o teste
    console.log('\n3. Verificando registros após o teste...');
    const afterRecords = await storage.pool.request()
      .input('serialNumber', 'NVARCHAR', '002606')
      .query(`
        SELECT id, serialNumber, locationId, status, createdAt,
               count1_found, count2_found, count3_found, count4_found
        FROM inventory_serial_items 
        WHERE serialNumber = @serialNumber
        ORDER BY createdAt DESC
      `);
    
    console.log(`Registros encontrados: ${afterRecords.recordset.length}`);
    afterRecords.recordset.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, LocationId: ${record.locationId}, Status: ${record.status}`);
      console.log(`     Count1: ${record.count1_found}, Count2: ${record.count2_found}, Count3: ${record.count3_found}`);
      console.log(`     Criado em: ${record.createdAt}`);
    });
    
    // Verificar se um novo registro foi criado
    const newRecords = afterRecords.recordset.length - beforeRecords.recordset.length;
    if (newRecords > 0) {
      console.log(`\n✅ SUCESSO: ${newRecords} novo(s) registro(s) criado(s)!`);
    } else {
      console.log('\n❌ PROBLEMA: Nenhum novo registro foi criado.');
    }
    
    // Verificar registros com status EXTRA (divergência)
    console.log('\n4. Verificando registros com status EXTRA...');
    const extraRecords = await storage.pool.request()
      .input('serialNumber', 'NVARCHAR', '002606')
      .query(`
        SELECT id, serialNumber, locationId, status, createdAt
        FROM inventory_serial_items 
        WHERE serialNumber = @serialNumber AND status = 'EXTRA'
        ORDER BY createdAt DESC
      `);
    
    console.log(`Registros EXTRA encontrados: ${extraRecords.recordset.length}`);
    extraRecords.recordset.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, LocationId: ${record.locationId}, Status: ${record.status}`);
    });
    
  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

// Executar o teste
testLocationDiscrepancy();