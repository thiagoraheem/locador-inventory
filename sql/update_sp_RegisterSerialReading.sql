-- Update stored procedure sp_RegisterSerialReading to handle location discrepancies
-- When a serial is found in a different location, create a new record instead of updating existing one

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterSerialReading')
BEGIN
    DROP PROCEDURE sp_RegisterSerialReading;
    PRINT 'Procedure sp_RegisterSerialReading removida para recriação';
END;

GO

CREATE PROCEDURE sp_RegisterSerialReading
    @InventoryId INT,
    @SerialNumber NVARCHAR(255),
    @CountStage NVARCHAR(10),
    @UserId INT,
    @ScannedLocationId INT = NULL -- Nova localização onde o serial foi encontrado
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ProductId INT;
    DECLARE @OriginalLocationId INT;
    DECLARE @LocationId INT;
    DECLARE @RowsUpdated INT;
    DECLARE @ExistingRecordId INT;
    
    -- Verificar se série existe no inventário
    SELECT @ExistingRecordId = id, @ProductId = productId, @OriginalLocationId = locationId
    FROM inventory_serial_items 
    WHERE inventoryId = @InventoryId 
    AND serialNumber = @SerialNumber;
    
    -- Determinar a localização a ser usada
    SET @LocationId = ISNULL(@ScannedLocationId, @OriginalLocationId);
    
    IF @ProductId IS NULL
    BEGIN
        -- Série não encontrada no inventário esperado
        -- Verificar se existe em stock_items
        SELECT @ProductId = si.productId, @LocationId = ISNULL(@ScannedLocationId, si.locationId)
        FROM stock_items si
        JOIN products p ON si.productId = p.id
        WHERE si.serialNumber = @SerialNumber
        AND p.hasSerialControl = 1
        AND si.isActive = 1;
        
        IF @ProductId IS NOT NULL
        BEGIN
            -- Série existe mas não estava no inventário - adicionar como EXTRA
            INSERT INTO inventory_serial_items (
                inventoryId, stockItemId, serialNumber, productId, locationId, 
                expectedStatus, status, createdAt, updatedAt
            )
            SELECT 
                @InventoryId, si.id, @SerialNumber, @ProductId, @LocationId,
                0, 'EXTRA', GETDATE(), GETDATE()
            FROM stock_items si
            WHERE si.serialNumber = @SerialNumber
            AND si.productId = @ProductId;
            
            SET @ExistingRecordId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            -- Série não encontrada no sistema
            RAISERROR('Número de série não encontrado no sistema', 16, 1);
            RETURN;
        END;
    END
    ELSE
    BEGIN
        -- Série existe no inventário
        -- Verificar se há divergência de localização
        IF @ScannedLocationId IS NOT NULL AND @ScannedLocationId != @OriginalLocationId
        BEGIN
            -- Localização diferente - criar novo registro para a nova localização
            INSERT INTO inventory_serial_items (
                inventoryId, stockItemId, serialNumber, productId, locationId, 
                expectedStatus, status, createdAt, updatedAt
            )
            SELECT 
                @InventoryId, si.id, @SerialNumber, @ProductId, @ScannedLocationId,
                0, 'EXTRA', GETDATE(), GETDATE()
            FROM stock_items si
            WHERE si.serialNumber = @SerialNumber
            AND si.productId = @ProductId;
            
            SET @ExistingRecordId = SCOPE_IDENTITY();
            SET @LocationId = @ScannedLocationId;
        END
        -- Se não há divergência, usar o registro existente
    END;
    
    -- Atualizar inventory_serial_items com informações da contagem
    UPDATE inventory_serial_items 
    SET 
        count1_found = CASE WHEN @CountStage = 'count1' THEN 1 ELSE count1_found END,
        count2_found = CASE WHEN @CountStage = 'count2' THEN 1 ELSE count2_found END,
        count3_found = CASE WHEN @CountStage = 'count3' THEN 1 ELSE count3_found END,
        count4_found = CASE WHEN @CountStage = 'count4' THEN 1 ELSE count4_found END,
        count1_by = CASE WHEN @CountStage = 'count1' THEN @UserId ELSE count1_by END,
        count2_by = CASE WHEN @CountStage = 'count2' THEN @UserId ELSE count2_by END,
        count3_by = CASE WHEN @CountStage = 'count3' THEN @UserId ELSE count3_by END,
        count4_by = CASE WHEN @CountStage = 'count4' THEN @UserId ELSE count4_by END,
        count1_at = CASE WHEN @CountStage = 'count1' THEN GETDATE() ELSE count1_at END,
        count2_at = CASE WHEN @CountStage = 'count2' THEN GETDATE() ELSE count2_at END,
        count3_at = CASE WHEN @CountStage = 'count3' THEN GETDATE() ELSE count3_at END,
        count4_at = CASE WHEN @CountStage = 'count4' THEN GETDATE() ELSE count4_at END,
        status = 'FOUND',
        updatedAt = GETDATE()
    WHERE id = @ExistingRecordId;

    SET @RowsUpdated = @@ROWCOUNT;
    
    IF @RowsUpdated = 0
    BEGIN
        RAISERROR('Número de série não encontrado ou não foi possível atualizar', 16, 1);
        RETURN;
    END;
    
    -- CRITICAL: Verificar se existe registro na inventory_items para o produto no local encontrado
    -- Se não existir, criar um novo registro
    DECLARE @InventoryItemId INT;
    
    SELECT @InventoryItemId = id 
    FROM inventory_items 
    WHERE inventoryId = @InventoryId 
    AND productId = @ProductId 
    AND locationId = @LocationId;
    
    IF @InventoryItemId IS NULL
    BEGIN
        -- Criar novo registro na inventory_items para o produto no local onde foi encontrado
        INSERT INTO inventory_items (
            inventoryId, productId, locationId, expectedQuantity, 
            status, createdAt, updatedAt
        )
        VALUES (
            @InventoryId, @ProductId, @LocationId, 0,
            'PENDING', GETDATE(), GETDATE()
        );
        
        SET @InventoryItemId = SCOPE_IDENTITY();
    END;
    
    -- Incrementar contagem na tabela inventory_items
    DECLARE @CountColumn NVARCHAR(50);
    DECLARE @CountByColumn NVARCHAR(50);
    DECLARE @CountAtColumn NVARCHAR(50);
    
    SET @CountColumn = @CountStage; -- count1, count2, count3, count4
    SET @CountByColumn = @CountStage + 'By'; -- count1By, count2By, etc.
    SET @CountAtColumn = @CountStage + 'At'; -- count1At, count2At, etc.
    
    -- Usar SQL dinâmico para atualizar a coluna correta
    DECLARE @SQL NVARCHAR(MAX);
    SET @SQL = N'
        UPDATE inventory_items 
        SET 
            ' + @CountColumn + ' = ISNULL(' + @CountColumn + ', 0) + 1,
            ' + @CountByColumn + ' = NULL,
            ' + @CountAtColumn + ' = GETDATE(),
            updatedAt = GETDATE()
        WHERE id = @InventoryItemId';
    
    EXEC sp_executesql @SQL, 
        N'@InventoryItemId INT', 
        @InventoryItemId;
    
    -- Retornar resultado
    SELECT 
        1 as success,
        'Leitura registrada com sucesso' as message,
        @SerialNumber as serialNumber,
        @ProductId as productId,
        @LocationId as locationId;
END;

GO

PRINT 'Procedure sp_RegisterSerialReading atualizada para lidar com divergências de localização';