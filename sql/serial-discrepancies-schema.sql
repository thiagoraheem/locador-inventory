-- ===================================================================
-- SISTEMA DE DIVERGÊNCIAS DE NÚMEROS DE SÉRIE
-- Estrutura para rastreamento e conciliação com ERP
-- ===================================================================

-- 1. TABELA PRINCIPAL: Divergências de Números de Série
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'inventory_serial_discrepancies')
BEGIN
    CREATE TABLE inventory_serial_discrepancies (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        serialNumber NVARCHAR(255) NOT NULL,
        productId INT NOT NULL,
        productSku NVARCHAR(100) NOT NULL,
        productName NVARCHAR(255) NOT NULL,
        
        -- Localização esperada vs encontrada
        expectedLocationId INT NULL,
        expectedLocationCode NVARCHAR(50) NULL,
        expectedLocationName NVARCHAR(255) NULL,
        
        foundLocationId INT NULL,
        foundLocationCode NVARCHAR(50) NULL,
        foundLocationName NVARCHAR(255) NULL,
        
        -- Tipo de divergência
        discrepancyType NVARCHAR(50) NOT NULL, -- 'LOCATION_MISMATCH', 'NOT_FOUND', 'UNEXPECTED_FOUND'
        
        -- Status da divergência
        status NVARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'MIGRATED_TO_ERP'
        
        -- Informações de auditoria
        foundBy NVARCHAR(255) NULL,
        foundAt DATETIME2 NULL,
        countStage NVARCHAR(10) NULL, -- 'count1', 'count2', 'count3', 'count4'
        
        -- Observações e resolução
        notes NVARCHAR(1000) NULL,
        resolutionNotes NVARCHAR(1000) NULL,
        resolvedBy NVARCHAR(255) NULL,
        resolvedAt DATETIME2 NULL,
        
        -- Migração ERP
        migratedToERP BIT DEFAULT 0,
        migratedAt DATETIME2 NULL,
        migratedBy NVARCHAR(255) NULL,
        erpResponse NVARCHAR(MAX) NULL,
        
        -- Timestamps
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE(),
        
        -- Constraints
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (expectedLocationId) REFERENCES locations(id),
        FOREIGN KEY (foundLocationId) REFERENCES locations(id)
    );
    
    PRINT 'Tabela inventory_serial_discrepancies criada com sucesso';
END
ELSE
BEGIN
    PRINT 'Tabela inventory_serial_discrepancies já existe';
END;

-- 2. ÍNDICES PARA PERFORMANCE
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_serial_discrepancies_inventory')
BEGIN
    CREATE NONCLUSTERED INDEX IX_serial_discrepancies_inventory 
    ON inventory_serial_discrepancies (inventoryId);
    PRINT 'Índice IX_serial_discrepancies_inventory criado';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_serial_discrepancies_serial')
BEGIN
    CREATE NONCLUSTERED INDEX IX_serial_discrepancies_serial 
    ON inventory_serial_discrepancies (serialNumber);
    PRINT 'Índice IX_serial_discrepancies_serial criado';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_serial_discrepancies_type')
BEGIN
    CREATE NONCLUSTERED INDEX IX_serial_discrepancies_type 
    ON inventory_serial_discrepancies (discrepancyType, status);
    PRINT 'Índice IX_serial_discrepancies_type criado';
END;

-- 3. STORED PROCEDURE: Processar divergências de um inventário
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ProcessSerialDiscrepancies')
BEGIN
    DROP PROCEDURE sp_ProcessSerialDiscrepancies;
    PRINT 'Procedure sp_ProcessSerialDiscrepancies removida para recriação';
END;

CREATE PROCEDURE sp_ProcessSerialDiscrepancies
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Limpar divergências existentes para este inventário
    DELETE FROM inventory_serial_discrepancies WHERE inventoryId = @InventoryId;
    
    -- 1. NÚMEROS DE SÉRIE ENCONTRADOS EM LOCAIS DIFERENTES DOS ESPERADOS
    INSERT INTO inventory_serial_discrepancies (
        inventoryId, serialNumber, productId, productSku, productName,
        expectedLocationId, expectedLocationCode, expectedLocationName,
        foundLocationId, foundLocationCode, foundLocationName,
        discrepancyType, foundBy, foundAt, countStage
    )
    SELECT 
        isi.inventoryId,
        isi.serialNumber,
        isi.productId,
        p.sku,
        p.name,
        -- Local esperado (onde deveria estar)
        si.locationId,
        l_expected.code,
        l_expected.name,
        -- Local encontrado (onde foi encontrado)
        isi.locationId,
        l_found.code,
        l_found.name,
        'LOCATION_MISMATCH',
        CASE 
            WHEN isi.count1_found = 1 THEN isi.count1_by
            WHEN isi.count2_found = 1 THEN isi.count2_by
            WHEN isi.count3_found = 1 THEN isi.count3_by
            WHEN isi.count4_found = 1 THEN isi.count4_by
        END,
        CASE 
            WHEN isi.count1_found = 1 THEN isi.count1_at
            WHEN isi.count2_found = 1 THEN isi.count2_at
            WHEN isi.count3_found = 1 THEN isi.count3_at
            WHEN isi.count4_found = 1 THEN isi.count4_at
        END,
        CASE 
            WHEN isi.count1_found = 1 THEN 'count1'
            WHEN isi.count2_found = 1 THEN 'count2'
            WHEN isi.count3_found = 1 THEN 'count3'
            WHEN isi.count4_found = 1 THEN 'count4'
        END
    FROM inventory_serial_items isi
    JOIN products p ON isi.productId = p.id
    JOIN stock_items si ON isi.stockItemId = si.id
    JOIN locations l_expected ON si.locationId = l_expected.id
    JOIN locations l_found ON isi.locationId = l_found.id
    WHERE isi.inventoryId = @InventoryId
    AND isi.finalStatus = 1
    AND si.locationId != isi.locationId; -- Encontrado em local diferente
    
    -- 2. NÚMEROS DE SÉRIE ESPERADOS QUE NÃO FORAM ENCONTRADOS
    INSERT INTO inventory_serial_discrepancies (
        inventoryId, serialNumber, productId, productSku, productName,
        expectedLocationId, expectedLocationCode, expectedLocationName,
        discrepancyType
    )
    SELECT 
        isi.inventoryId,
        isi.serialNumber,
        isi.productId,
        p.sku,
        p.name,
        si.locationId,
        l.code,
        l.name,
        'NOT_FOUND'
    FROM inventory_serial_items isi
    JOIN products p ON isi.productId = p.id
    JOIN stock_items si ON isi.stockItemId = si.id
    JOIN locations l ON si.locationId = l.id
    WHERE isi.inventoryId = @InventoryId
    AND isi.expectedStatus = 1 -- Deveria estar presente
    AND isi.status = 'PENDING'; -- Não foi encontrado
    
    -- 3. NÚMEROS DE SÉRIE ENCONTRADOS QUE NÃO ERAM ESPERADOS
    INSERT INTO inventory_serial_discrepancies (
        inventoryId, serialNumber, productId, productSku, productName,
        foundLocationId, foundLocationCode, foundLocationName,
        discrepancyType, foundBy, foundAt, countStage
    )
    SELECT 
        isi.inventoryId,
        isi.serialNumber,
        isi.productId,
        p.sku,
        p.name,
        isi.locationId,
        l.code,
        l.name,
        'UNEXPECTED_FOUND',
        CASE 
            WHEN isi.count1_found = 1 THEN isi.count1_by
            WHEN isi.count2_found = 1 THEN isi.count2_by
            WHEN isi.count3_found = 1 THEN isi.count3_by
            WHEN isi.count4_found = 1 THEN isi.count4_by
        END,
        CASE 
            WHEN isi.count1_found = 1 THEN isi.count1_at
            WHEN isi.count2_found = 1 THEN isi.count2_at
            WHEN isi.count3_found = 1 THEN isi.count3_at
            WHEN isi.count4_found = 1 THEN isi.count4_at
        END,
        CASE 
            WHEN isi.count1_found = 1 THEN 'count1'
            WHEN isi.count2_found = 1 THEN 'count2'
            WHEN isi.count3_found = 1 THEN 'count3'
            WHEN isi.count4_found = 1 THEN 'count4'
        END
    FROM inventory_serial_items isi
    JOIN products p ON isi.productId = p.id
    JOIN locations l ON isi.locationId = l.id
    WHERE isi.inventoryId = @InventoryId
    AND isi.expectedStatus = 0 -- Não deveria estar presente
    AND isi.status = 'FOUND'; -- Mas foi encontrado
    
    -- Retornar estatísticas
    SELECT 
        COUNT(*) as totalDiscrepancies,
        SUM(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 ELSE 0 END) as locationMismatches,
        SUM(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
        SUM(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 ELSE 0 END) as unexpectedFound
    FROM inventory_serial_discrepancies
    WHERE inventoryId = @InventoryId;
END;

PRINT 'Procedure sp_ProcessSerialDiscrepancies criada';
GO

-- 4. STORED PROCEDURE: Marcar divergências como migradas para ERP
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_MarkDiscrepanciesAsMigrated')
BEGIN
    DROP PROCEDURE sp_MarkDiscrepanciesAsMigrated;
    PRINT 'Procedure sp_MarkDiscrepanciesAsMigrated removida para recriação';
END;

CREATE PROCEDURE sp_MarkDiscrepanciesAsMigrated
    @InventoryId INT,
    @UserId NVARCHAR(255),
    @ERPResponse NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE inventory_serial_discrepancies
    SET 
        migratedToERP = 1,
        migratedAt = GETDATE(),
        migratedBy = @UserId,
        erpResponse = @ERPResponse,
        status = 'MIGRATED_TO_ERP',
        updatedAt = GETDATE()
    WHERE inventoryId = @InventoryId
    AND migratedToERP = 0;
    
    SELECT @@ROWCOUNT as migratedCount;
END;

PRINT 'Procedure sp_MarkDiscrepanciesAsMigrated criada';
GO

PRINT 'Schema de divergências de números de série criado com sucesso!';