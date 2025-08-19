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

async function testStoredProcedureLogic() {
  let pool;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!');
    
    const testInventoryId = 35;
    console.log(`\n🎯 Testando lógica da SP para inventário ID: ${testInventoryId}`);
    
    // 1. Testar a primeira condição da SP: LOCATION_MISMATCH
    console.log('\n📊 Testando condição 1: LOCATION_MISMATCH');
    console.log('Query: inventory_serial_items com finalStatus=1 e si.locationId != isi.locationId');
    
    const locationMismatchTest = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          isi.serialNumber,
          isi.productId,
          isi.locationId as foundLocationId,
          isi.finalStatus,
          isi.status,
          si.locationId as expectedLocationId,
          p.sku,
          p.name as productName,
          l_expected.code as expectedLocationCode,
          l_found.code as foundLocationCode
        FROM inventory_serial_items isi
        JOIN products p ON isi.productId = p.id
        JOIN stock_items si ON isi.stockItemId = si.id
        JOIN locations l_expected ON si.locationId = l_expected.id
        JOIN locations l_found ON isi.locationId = l_found.id
        WHERE isi.inventoryId = @inventoryId
        AND isi.finalStatus = 1
        AND si.locationId != isi.locationId
        ORDER BY isi.serialNumber
      `);
    
    console.log(`Resultado: ${locationMismatchTest.recordset.length} registros encontrados`);
    
    if (locationMismatchTest.recordset.length > 0) {
      console.log('\nPrimeiros 5 exemplos:');
      locationMismatchTest.recordset.slice(0, 5).forEach((row, index) => {
        console.log(`  ${index + 1}. Serial: ${row.serialNumber}`);
        console.log(`     Produto: ${row.sku} - ${row.productName}`);
        console.log(`     Esperado em: ${row.expectedLocationCode} (ID: ${row.expectedLocationId})`);
        console.log(`     Encontrado em: ${row.foundLocationCode} (ID: ${row.foundLocationId})`);
        console.log(`     Status: ${row.status}, FinalStatus: ${row.finalStatus}`);
        console.log('');
      });
    }
    
    // 2. Testar a segunda condição da SP: NOT_FOUND
    console.log('\n📊 Testando condição 2: NOT_FOUND');
    console.log('Query: inventory_serial_items com expectedStatus=1 e status=PENDING');
    
    const notFoundTest = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          isi.serialNumber,
          isi.productId,
          isi.expectedStatus,
          isi.status,
          si.locationId as expectedLocationId,
          p.sku,
          p.name as productName,
          l.code as expectedLocationCode
        FROM inventory_serial_items isi
        JOIN products p ON isi.productId = p.id
        JOIN stock_items si ON isi.stockItemId = si.id
        JOIN locations l ON si.locationId = l.id
        WHERE isi.inventoryId = @inventoryId
        AND isi.expectedStatus = 1
        AND isi.status = 'PENDING'
        ORDER BY isi.serialNumber
      `);
    
    console.log(`Resultado: ${notFoundTest.recordset.length} registros encontrados`);
    
    if (notFoundTest.recordset.length > 0) {
      console.log('\nPrimeiros 5 exemplos:');
      notFoundTest.recordset.slice(0, 5).forEach((row, index) => {
        console.log(`  ${index + 1}. Serial: ${row.serialNumber}`);
        console.log(`     Produto: ${row.sku} - ${row.productName}`);
        console.log(`     Esperado em: ${row.expectedLocationCode} (ID: ${row.expectedLocationId})`);
        console.log(`     Status: ${row.status}, ExpectedStatus: ${row.expectedStatus}`);
        console.log('');
      });
    }
    
    // 3. Testar a terceira condição da SP: UNEXPECTED_FOUND
    console.log('\n📊 Testando condição 3: UNEXPECTED_FOUND');
    console.log('Query: inventory_serial_items com expectedStatus=0 e status=FOUND');
    
    const unexpectedFoundTest = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          isi.serialNumber,
          isi.productId,
          isi.locationId as foundLocationId,
          isi.expectedStatus,
          isi.status,
          p.sku,
          p.name as productName,
          l.code as foundLocationCode
        FROM inventory_serial_items isi
        JOIN products p ON isi.productId = p.id
        JOIN locations l ON isi.locationId = l.id
        WHERE isi.inventoryId = @inventoryId
        AND isi.expectedStatus = 0
        AND isi.status = 'FOUND'
        ORDER BY isi.serialNumber
      `);
    
    console.log(`Resultado: ${unexpectedFoundTest.recordset.length} registros encontrados`);
    
    if (unexpectedFoundTest.recordset.length > 0) {
      console.log('\nPrimeiros 5 exemplos:');
      unexpectedFoundTest.recordset.slice(0, 5).forEach((row, index) => {
        console.log(`  ${index + 1}. Serial: ${row.serialNumber}`);
        console.log(`     Produto: ${row.sku} - ${row.productName}`);
        console.log(`     Encontrado em: ${row.foundLocationCode} (ID: ${row.foundLocationId})`);
        console.log(`     Status: ${row.status}, ExpectedStatus: ${row.expectedStatus}`);
        console.log('');
      });
    }
    
    // 4. Verificar se há problema com finalStatus vs status
    console.log('\n🔍 Verificando diferença entre status e finalStatus:');
    const statusComparison = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          status,
          finalStatus,
          COUNT(*) as quantidade
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId
        GROUP BY status, finalStatus
        ORDER BY status, finalStatus
      `);
    
    console.log('Comparação status vs finalStatus:');
    statusComparison.recordset.forEach(row => {
      console.log(`  - Status: ${row.status || 'NULL'}, FinalStatus: ${row.finalStatus || 'NULL'}, Quantidade: ${row.quantidade}`);
    });
    
    // 5. Total calculado por cada condição
    const totalCalculated = locationMismatchTest.recordset.length + 
                           notFoundTest.recordset.length + 
                           unexpectedFoundTest.recordset.length;
    
    console.log('\n✅ Resumo dos cálculos:');
    console.log(`  - LOCATION_MISMATCH: ${locationMismatchTest.recordset.length}`);
    console.log(`  - NOT_FOUND: ${notFoundTest.recordset.length}`);
    console.log(`  - UNEXPECTED_FOUND: ${unexpectedFoundTest.recordset.length}`);
    console.log(`  - TOTAL CALCULADO: ${totalCalculated}`);
    console.log(`  - TOTAL NA TABELA: 48`);
    
    if (totalCalculated === 48) {
      console.log('\n✅ Os cálculos estão corretos!');
    } else {
      console.log(`\n❌ Discrepância: Calculado ${totalCalculated}, Registrado 48`);
      
      // Verificar se há registros na tabela de divergências que não deveriam estar lá
      console.log('\n🔍 Verificando registros na tabela de divergências:');
      const existingDiscrepancies = await pool.request()
        .input('inventoryId', testInventoryId)
        .query(`
          SELECT 
            discrepancyType,
            COUNT(*) as quantidade
          FROM inventory_serial_discrepancies 
          WHERE inventoryId = @inventoryId
          GROUP BY discrepancyType
        `);
      
      console.log('Divergências registradas na tabela:');
      existingDiscrepancies.recordset.forEach(row => {
        console.log(`  - ${row.discrepancyType}: ${row.quantidade}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

testStoredProcedureLogic();