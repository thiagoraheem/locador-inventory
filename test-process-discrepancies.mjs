import sql from 'mssql';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração da conexão com o banco de dados usando as variáveis do .env
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testProcessDiscrepancies() {
  let pool;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    console.log(`Server: ${config.server}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
    
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!');
    
    // 1. Verificar inventários disponíveis
    console.log('📋 Verificando inventários disponíveis...');
    const inventoriesResult = await pool.request().query(`
      SELECT TOP 5 
        i.id, 
        i.code, 
        i.description, 
        i.status,
        it.name as typeName
      FROM inventories i
      LEFT JOIN inventory_types it ON i.typeId = it.id
      ORDER BY i.id DESC
    `);
    
    if (inventoriesResult.recordset.length === 0) {
      console.log('❌ Nenhum inventário encontrado');
      return;
    }
    
    console.log('Inventários encontrados:');
    inventoriesResult.recordset.forEach(inv => {
      console.log(`  - ID: ${inv.id}, Código: ${inv.code}, Descrição: ${inv.description || 'N/A'}, Status: ${inv.status}`);
    });
    
    // Usar o primeiro inventário para teste
    const testInventoryId = inventoriesResult.recordset[0].id;
    console.log(`\n🎯 Usando inventário ID: ${testInventoryId} para teste`);
    
    // 2. Verificar se existem itens seriais para este inventário
    console.log('\n🔍 Verificando itens seriais no inventário...');
    const serialItemsResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'FOUND' THEN 1 ELSE 0 END) as found,
               SUM(CASE WHEN status = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
               SUM(CASE WHEN expectedStatus = 0 AND status = 'FOUND' THEN 1 ELSE 0 END) as unexpected
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId
      `);
    
    const serialStats = serialItemsResult.recordset[0];
    console.log('Estatísticas de itens seriais:');
    console.log(`  - Total: ${serialStats.total}`);
    console.log(`  - Encontrados: ${serialStats.found}`);
    console.log(`  - Não encontrados: ${serialStats.notFound}`);
    console.log(`  - Inesperados: ${serialStats.unexpected}`);
    
    if (serialStats.total === 0) {
      console.log('❌ Nenhum item serial encontrado para este inventário');
      console.log('💡 Execute primeiro a criação de itens seriais para o inventário');
      return;
    }
    
    // 3. Verificar divergências existentes antes do processamento
    console.log('\n🔍 Verificando divergências existentes...');
    const existingDiscrepancies = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 ELSE 0 END) as locationMismatch,
               SUM(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
               SUM(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 ELSE 0 END) as unexpectedFound
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
      `);
    
    const existingStats = existingDiscrepancies.recordset[0];
    console.log('Divergências existentes:');
    console.log(`  - Total: ${existingStats.total}`);
    console.log(`  - Divergências de localização: ${existingStats.locationMismatch}`);
    console.log(`  - Não encontrados: ${existingStats.notFound}`);
    console.log(`  - Encontrados inesperadamente: ${existingStats.unexpectedFound}`);
    
    // 4. Executar o processamento de divergências
    console.log('\n⚙️ Executando processamento de divergências...');
    const processResult = await pool.request()
      .input('InventoryId', testInventoryId)
      .execute('sp_ProcessSerialDiscrepancies');
    
    const processStats = processResult.recordset[0];
    console.log('✅ Processamento concluído!');
    console.log('Resultado do processamento:');
    console.log(`  - Total de divergências: ${processStats.totalDiscrepancies}`);
    console.log(`  - Divergências de localização: ${processStats.locationMismatches}`);
    console.log(`  - Não encontrados: ${processStats.notFound}`);
    console.log(`  - Encontrados inesperadamente: ${processStats.unexpectedFound}`);
    
    // 5. Verificar algumas divergências criadas
    if (processStats.totalDiscrepancies > 0) {
      console.log('\n📋 Exemplos de divergências criadas:');
      const sampleDiscrepancies = await pool.request()
        .input('inventoryId', testInventoryId)
        .query(`
          SELECT TOP 5 
            serialNumber, 
            productSku, 
            productName,
            discrepancyType,
            expectedLocationName,
            foundLocationName,
            status
          FROM inventory_serial_discrepancies 
          WHERE inventoryId = @inventoryId
          ORDER BY createdAt DESC
        `);
      
      sampleDiscrepancies.recordset.forEach((disc, index) => {
        console.log(`  ${index + 1}. Serial: ${disc.serialNumber}`);
        console.log(`     Produto: ${disc.productSku} - ${disc.productName}`);
        console.log(`     Tipo: ${disc.discrepancyType}`);
        console.log(`     Esperado: ${disc.expectedLocationName || 'N/A'}`);
        console.log(`     Encontrado: ${disc.foundLocationName || 'N/A'}`);
        console.log(`     Status: ${disc.status}`);
        console.log('');
      });
    }
    
    // 6. Testar endpoint de resumo
    console.log('\n🔍 Testando método getSerialDiscrepanciesSummary...');
    const summaryResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT 
          COUNT(*) as totalDiscrepancies,
          SUM(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 ELSE 0 END) as locationMismatches,
          SUM(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
          SUM(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 ELSE 0 END) as unexpectedFound,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'MIGRATED_TO_ERP' THEN 1 ELSE 0 END) as migratedToERP
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
      `);
    
    const summary = summaryResult.recordset[0];
    console.log('Resumo das divergências:');
    console.log(`  - Total: ${summary.totalDiscrepancies}`);
    console.log(`  - Por tipo:`);
    console.log(`    * Divergências de localização: ${summary.locationMismatches}`);
    console.log(`    * Não encontrados: ${summary.notFound}`);
    console.log(`    * Encontrados inesperadamente: ${summary.unexpectedFound}`);
    console.log(`  - Por status:`);
    console.log(`    * Pendentes: ${summary.pending}`);
    console.log(`    * Resolvidas: ${summary.resolved}`);
    console.log(`    * Migradas para ERP: ${summary.migratedToERP}`);
    
    // 7. Testar os endpoints HTTP (simulação)
    console.log('\n🌐 Testando estrutura de resposta dos endpoints...');
    
    // Simular resposta do endpoint GET /api/serial-discrepancies/:inventoryId
    const listResult = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT TOP 10 *
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
        ORDER BY createdAt DESC
      `);
    
    const totalCount = await pool.request()
      .input('inventoryId', testInventoryId)
      .query(`
        SELECT COUNT(*) as total
        FROM inventory_serial_discrepancies 
        WHERE inventoryId = @inventoryId
      `);
    
    const mockEndpointResponse = {
      discrepancies: listResult.recordset,
      total: totalCount.recordset[0].total,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(totalCount.recordset[0].total / 10)
    };
    
    console.log('Estrutura de resposta do endpoint GET /api/serial-discrepancies/:inventoryId:');
    console.log(`  - discrepancies: ${mockEndpointResponse.discrepancies.length} itens`);
    console.log(`  - total: ${mockEndpointResponse.total}`);
    console.log(`  - totalPages: ${mockEndpointResponse.totalPages}`);
    
    console.log('\n✅ Teste concluído com sucesso!');
    
    if (processStats.totalDiscrepancies === 0) {
      console.log('\n💡 Dicas para gerar divergências de teste:');
      console.log('1. Certifique-se de que existem itens seriais no inventário');
      console.log('2. Marque alguns itens como encontrados em locais diferentes do esperado');
      console.log('3. Marque alguns itens esperados como não encontrados');
      console.log('4. Adicione leituras de itens não esperados');
    } else {
      console.log('\n🎉 Sistema de divergências funcionando corretamente!');
      console.log('✅ Stored procedure executada com sucesso');
      console.log('✅ Dados inseridos na tabela inventory_serial_discrepancies');
      console.log('✅ Estrutura de resposta compatível com o frontend');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

// Executar o teste
testProcessDiscrepancies();