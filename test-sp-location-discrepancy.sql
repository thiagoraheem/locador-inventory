-- Teste da stored procedure sp_RegisterSerialReading para divergência de localização
-- Este script testa se a procedure cria corretamente novos registros quando há divergência

USE inventory;
GO

-- Verificar se a stored procedure existe
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterSerialReading')
    PRINT 'Stored procedure sp_RegisterSerialReading encontrada';
ELSE
    PRINT 'ERRO: Stored procedure sp_RegisterSerialReading não encontrada';

-- Verificar registros existentes para o serial 002606 no inventário 35
PRINT 'Registros existentes para serial 002606 no inventário 35:';
SELECT 
    id, inventoryId, serialNumber, productId, locationId, status,
    count1_found, count2_found, count3_found, count4_found
FROM inventory_serial_items 
WHERE inventoryId = 35 AND serialNumber = '002606';

-- Executar stored procedure com divergência de localização
PRINT 'Executando stored procedure com divergência de localização...';
BEGIN TRY
    EXEC sp_RegisterSerialReading 
        @InventoryId = 35,
        @SerialNumber = '002606',
        @CountStage = 'count1',
        @UserId = 1,
        @ScannedLocationId = 2;
END TRY
BEGIN CATCH
    PRINT 'ERRO ao executar stored procedure:';
    PRINT ERROR_MESSAGE();
END CATCH;

-- Verificar registros após execução
PRINT 'Registros após execução da stored procedure:';
SELECT 
    id, inventoryId, serialNumber, productId, locationId, status,
    count1_found, count2_found, count3_found, count4_found,
    createdAt, updatedAt
FROM inventory_serial_items 
WHERE inventoryId = 35 AND serialNumber = '002606'
ORDER BY id;

-- Verificar se foi criado registro na inventory_items para o novo local
PRINT 'Registros na inventory_items para o produto no local 2:';
SELECT 
    ii.id, ii.inventoryId, ii.productId, ii.locationId,
    ii.count1, ii.count2, ii.count3, ii.count4,
    p.name as productName, l.name as locationName
FROM inventory_items ii
JOIN products p ON ii.productId = p.id
JOIN locations l ON ii.locationId = l.id
WHERE ii.inventoryId = 35 
AND ii.productId = (SELECT TOP 1 productId FROM inventory_serial_items WHERE serialNumber = '002606')
AND ii.locationId = 2;