import { getStorage } from './server/db.ts';

async function testDiscrepancyRecords() {
  try {
    const storage = await getStorage();
    
    console.log('\n=== Verificando registros de discrepância ===');
    
    // Verificar registros na tabela inventory_items para localização 3
    const query = `
      SELECT TOP 10 
        ii.Id,
        ii.InventoryId,
        ii.ProductId,
        ii.LocationId,
        ii.ExpectedQuantity,
        ii.Count1Quantity,
        ii.Count2Quantity,
        ii.Status,
        ii.CreatedAt,
        l.Name as LocationName,
        p.Name as ProductName
      FROM inventory_items ii
      LEFT JOIN locations l ON ii.LocationId = l.Id
      LEFT JOIN products p ON ii.ProductId = p.Id
      WHERE ii.InventoryId = 35 
        AND ii.LocationId IN (2, 3)
      ORDER BY ii.CreatedAt DESC
    `;
    
    const result = await storage.query(query);
    
    console.log(`\nEncontrados ${result.recordset.length} registros:`);
    
    result.recordset.forEach(record => {
      console.log(`\nID: ${record.Id}`);
      console.log(`Produto: ${record.ProductName} (ID: ${record.ProductId})`);
      console.log(`Localização: ${record.LocationName} (ID: ${record.LocationId})`);
      console.log(`Esperado: ${record.ExpectedQuantity}`);
      console.log(`Count1: ${record.Count1Quantity}`);
      console.log(`Count2: ${record.Count2Quantity}`);
      console.log(`Status: ${record.Status}`);
      console.log(`Criado em: ${record.CreatedAt}`);
      console.log('---');
    });
    
    // Verificar também registros de serial readings
    const serialQuery = `
      SELECT TOP 10 
        isi.Id,
        isi.InventoryId,
        isi.SerialNumber,
        isi.ProductId,
        isi.LocationId,
        isi.CountStage,
        isi.ScannedLocationId,
        isi.CreatedAt,
        p.Name as ProductName
      FROM inventory_serial_items isi
      LEFT JOIN products p ON isi.ProductId = p.Id
      WHERE isi.InventoryId = 35 
        AND isi.SerialNumber = '002606'
      ORDER BY isi.CreatedAt DESC
    `;
    
    const serialResult = await storage.query(serialQuery);
    
    console.log(`\n\n=== Registros de Serial Reading para 002606 ===`);
    console.log(`Encontrados ${serialResult.recordset.length} registros:`);
    
    serialResult.recordset.forEach(record => {
      console.log(`\nID: ${record.Id}`);
      console.log(`Serial: ${record.SerialNumber}`);
      console.log(`Produto: ${record.ProductName} (ID: ${record.ProductId})`);
      console.log(`Localização Original: ${record.LocationId}`);
      console.log(`Localização Escaneada: ${record.ScannedLocationId}`);
      console.log(`Estágio: ${record.CountStage}`);
      console.log(`Criado em: ${record.CreatedAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Erro ao verificar registros:', error);
  }
}

testDiscrepancyRecords();