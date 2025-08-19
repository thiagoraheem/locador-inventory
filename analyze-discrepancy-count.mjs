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

async function analyzeDiscrepancyCount() {
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
    
    const testInventoryId = inventoriesResult.recordset[0].id;
    console.log(`\n🎯 Analisando inventário ID: ${testInventoryId}`);
    
    // 1. Verificar contagem de itens seriais por status
    console.log('\n📊 Análise de itens seriais:');
    const serialAnalysis = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          status,
          expectedStatus,
          COUNT(*) as quantidade,
          COUNT(CASE WHEN count1_found = 1 THEN 1 END) as count1_found,
          COUNT(CASE WHEN count2_found = 1 THEN 1 END) as count2_found,
          COUNT(CASE WHEN count3_found = 1 THEN 1 END) as count3_found,
          COUNT(CASE WHEN count4_found = 1 THEN 1 END) as count4_found
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId
        GROUP BY status, expectedStatus
        ORDER BY status, expectedStatus
      `);
    
    console.log('Status dos itens seriais:');
    serialAnalysis.recordset.forEach(row => {
      console.log(`  - Status: ${row.status}, Esperado: ${row.expectedStatus ? 'Sim' : 'Não'}, Quantidade: ${row.quantidade}`);
      console.log(`    Contagens: C1=${row.count1_found}, C2=${row.count2_found}, C3=${row.count3_found}, C4=${row.count4_found}`);
    });
    
    // 2. Verificar divergências de localização específicas
    console.log('\n🔍 Análise detalhada de divergências de localização:');
    const locationMismatchAnalysis = await pool.request()
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
          l_found.code as foundLocationCode,
          l_found.name as foundLocationName,
          -- Verificar se existe registro esperado em outra localização
          (
            SELECT TOP 1 l_expected.code 
            FROM stock_items si_expected
            JOIN locations l_expected ON si_expected.locationId = l_expected.id
            WHERE si_expected.serialNumber = isi.serialNumber
            AND si_expected.locationId != isi.locationId
          ) as expectedLocationCode
        FROM inventory_serial_items isi
        JOIN products p ON isi.productId = p.id
        JOIN locations l_found ON isi.locationId = l_found.id
        WHERE isi.inventoryId = @inventoryId
        AND isi.expectedStatus = 0  -- Não deveria estar presente
        AND isi.status = 'FOUND'    -- Mas foi encontrado
        ORDER BY isi.serialNumber
      `);
    
    console.log(`Total de itens com divergência de localização: ${locationMismatchAnalysis.recordset.length}`);
    
    if (locationMismatchAnalysis.recordset.length > 0) {
      console.log('\nPrimeiros 10 exemplos:');
      locationMismatchAnalysis.recordset.slice(0, 10).forEach((row, index) => {
        console.log(`  ${index + 1}. Serial: ${row.serialNumber}`);
        console.log(`     Produto: ${row.sku} - ${row.productName}`);
        console.log(`     Encontrado em: ${row.foundLocationCode} (${row.foundLocationName})`);
        console.log(`     Deveria estar em: ${row.expectedLocationCode || 'N/A'}`);
        console.log(`     Status: ${row.status}, Esperado: ${row.expectedStatus ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }
    
    // 3. Verificar se há duplicatas ou múltiplos registros para o mesmo serial
    console.log('\n🔍 Verificando duplicatas de números de série:');
    const duplicatesAnalysis = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          serialNumber,
          COUNT(*) as registros,
          STRING_AGG(CAST(locationId AS NVARCHAR), ', ') as locationIds,
          STRING_AGG(status, ', ') as statuses
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId
        GROUP BY serialNumber
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `);
    
    if (duplicatesAnalysis.recordset.length > 0) {
      console.log(`⚠️  Encontradas ${duplicatesAnalysis.recordset.length} séries com múltiplos registros:`);
      duplicatesAnalysis.recordset.forEach(row => {
        console.log(`  - Serial: ${row.serialNumber} (${row.registros} registros)`);
        console.log(`    Localizações: ${row.locationIds}`);
        console.log(`    Status: ${row.statuses}`);
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // 4. Comparar com o que deveria ser esperado no stock_items
    console.log('\n📋 Comparação com stock_items (dados esperados):');
    const expectedVsFound = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          'Esperados no inventário' as tipo,
          COUNT(*) as quantidade
        FROM stock_items si
        WHERE EXISTS (
          SELECT 1 FROM inventory_serial_items isi 
          WHERE isi.inventoryId = @inventoryId 
          AND isi.serialNumber = si.serialNumber
          AND isi.expectedStatus = 1
        )
        
        UNION ALL
        
        SELECT 
          'Encontrados no inventário' as tipo,
          COUNT(*) as quantidade
        FROM inventory_serial_items isi
        WHERE isi.inventoryId = @inventoryId
        AND isi.status = 'FOUND'
        
        UNION ALL
        
        SELECT 
          'Divergências de localização' as tipo,
          COUNT(*) as quantidade
        FROM inventory_serial_items isi
        WHERE isi.inventoryId = @inventoryId
        AND isi.expectedStatus = 0
        AND isi.status = 'FOUND'
      `);
    
    expectedVsFound.recordset.forEach(row => {
      console.log(`  - ${row.tipo}: ${row.quantidade}`);
    });
    
    // 5. Verificar se o número 48 está correto
    console.log('\n✅ Validação do número de divergências:');
    const validationResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        -- Contar divergências usando a mesma lógica da stored procedure
        SELECT 
          COUNT(*) as totalCalculado
        FROM inventory_serial_items isi
        JOIN products p ON isi.productId = p.id
        JOIN locations l ON isi.locationId = l.id
        WHERE isi.inventoryId = @inventoryId
        AND isi.expectedStatus = 0 -- Não deveria estar presente
        AND isi.status = 'FOUND'   -- Mas foi encontrado
      `);
    
    const calculatedTotal = validationResult.recordset[0].totalCalculado;
    console.log(`Total calculado pela lógica da SP: ${calculatedTotal}`);
    console.log(`Total na tabela de divergências: 48`);
    
    if (calculatedTotal === 48) {
      console.log('✅ O número 48 está CORRETO!');
      console.log('\n📝 Explicação:');
      console.log('- Estes são números de série que foram encontrados durante o inventário');
      console.log('- Mas que não deveriam estar presentes nas localizações onde foram encontrados');
      console.log('- Isso indica que eles foram movidos de suas localizações originais');
      console.log('- O sistema anterior pode ter mostrado apenas 20 por limitação de paginação ou filtro');
    } else {
      console.log(`❌ Discrepância encontrada! Calculado: ${calculatedTotal}, Registrado: 48`);
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

analyzeDiscrepancyCount();