-- ========================================
-- INVENTORY MANAGEMENT SYSTEM - DATABASE STRUCTURE UPDATE
-- Congelamento de Dados para Inventário
-- ========================================

-- Tabelas de snapshot para congelar dados durante inventário
-- Estas tabelas armazenam cópias dos dados das views no momento da criação do inventário

-- 1. Snapshot de categorias congeladas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_categories_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_categories_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        categoryId INT NOT NULL,
        idcompany INT,
        name NVARCHAR(255),
        description NVARCHAR(500),
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 2. Snapshot de empresas congeladas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_companies_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_companies_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        companyId INT NOT NULL,
        name NVARCHAR(255),
        description NVARCHAR(500),
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 3. Snapshot de locais congelados
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_locations_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_locations_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        locationId INT NOT NULL,
        code NVARCHAR(50),
        name NVARCHAR(255),
        description NVARCHAR(500),
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 4. Snapshot de produtos congelados
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_products_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_products_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        productId INT NOT NULL,
        sku NVARCHAR(100),
        name NVARCHAR(255),
        description NVARCHAR(500),
        categoryId INT,
        costValue DECIMAL(18,2),
        serialNumber NVARCHAR(100),
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 5. Snapshot de estoque congelado
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_stock_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_stock_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        stockId INT NOT NULL,
        productId INT NOT NULL,
        locationId INT NOT NULL,
        quantity INT DEFAULT 0,
        frozenAt DATETIME2 DEFAULT GETDATE(),
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 6. Snapshot de itens patrimoniais congelados
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_stock_items_snapshot]') AND type in (N'U'))
BEGIN
    CREATE TABLE inventory_stock_items_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        stockItemId INT NOT NULL,
        productId INT NOT NULL,
        locationId INT NOT NULL,
        assetTag NVARCHAR(100),
        description NVARCHAR(255),
        category NVARCHAR(100),
        location NVARCHAR(100),
        locationCode NVARCHAR(50),
        costValue DECIMAL(18,2),
        currentValue DECIMAL(18,2),
        condition NVARCHAR(50),
        serialNumber NVARCHAR(100),
        brand NVARCHAR(100),
        model NVARCHAR(100),
        companyId INT,
        acquisitionDate DATETIME2,
        quantity INT DEFAULT 1,
        isActive BIT DEFAULT 1,
        frozenAt DATETIME2 DEFAULT GETDATE(),
        createdAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );
END

-- 7. Adicionar campo para marcar inventário como "congelado"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'isFrozen')
BEGIN
    ALTER TABLE inventories ADD isFrozen BIT DEFAULT 0;
END

-- 8. Adicionar campo para data de congelamento
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'frozenAt')
BEGIN
    ALTER TABLE inventories ADD frozenAt DATETIME2 NULL;
END

-- 9. Adicionar campo para usuário responsável pelo congelamento
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'frozenBy')
BEGIN
    ALTER TABLE inventories ADD frozenBy NVARCHAR(50) NULL;
END

-- 10. Índices para melhor performance nas consultas de snapshot
CREATE NONCLUSTERED INDEX IX_inventory_categories_snapshot_inventoryId 
ON inventory_categories_snapshot (inventoryId);

CREATE NONCLUSTERED INDEX IX_inventory_companies_snapshot_inventoryId 
ON inventory_companies_snapshot (inventoryId);

CREATE NONCLUSTERED INDEX IX_inventory_locations_snapshot_inventoryId 
ON inventory_locations_snapshot (inventoryId);

CREATE NONCLUSTERED INDEX IX_inventory_products_snapshot_inventoryId 
ON inventory_products_snapshot (inventoryId);

CREATE NONCLUSTERED INDEX IX_inventory_stock_snapshot_inventoryId 
ON inventory_stock_snapshot (inventoryId);

CREATE NONCLUSTERED INDEX IX_inventory_stock_items_snapshot_inventoryId 
ON inventory_stock_items_snapshot (inventoryId);

-- 11. Procedure para congelar dados do inventário
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_FreezeInventoryData]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_FreezeInventoryData]
GO

CREATE PROCEDURE sp_FreezeInventoryData
    @InventoryId INT,
    @UserId NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Marcar inventário como congelado
        UPDATE inventories 
        SET isFrozen = 1, frozenAt = GETDATE(), frozenBy = @UserId
        WHERE id = @InventoryId;
        
        -- Congelar categorias
        INSERT INTO inventory_categories_snapshot (inventoryId, categoryId, idcompany, name, description, isActive)
        SELECT @InventoryId, id, idcompany, name, description, 1
        FROM categories
        WHERE isActive = 1;
        
        -- Congelar empresas
        INSERT INTO inventory_companies_snapshot (inventoryId, companyId, name, description, isActive)
        SELECT @InventoryId, id, name, description, 1
        FROM companies
        WHERE isActive = 1;
        
        -- Congelar locais
        INSERT INTO inventory_locations_snapshot (inventoryId, locationId, code, name, description, isActive)
        SELECT @InventoryId, id, code, name, description, 1
        FROM locations
        WHERE isActive = 1;
        
        -- Congelar produtos
        INSERT INTO inventory_products_snapshot (inventoryId, productId, sku, name, description, categoryId, costValue, serialNumber, isActive)
        SELECT @InventoryId, id, sku, name, description, categoryId, costValue, sku, 1
        FROM products
        WHERE isActive = 1;
        
        -- Congelar estoque
        INSERT INTO inventory_stock_snapshot (inventoryId, stockId, productId, locationId, quantity)
        SELECT @InventoryId, id, productId, locationId, quantity
        FROM stock;
        
        -- Congelar itens patrimoniais
        INSERT INTO inventory_stock_items_snapshot (
            inventoryId, stockItemId, productId, locationId, assetTag, description, 
            category, location, locationCode, costValue, currentValue, condition,
            serialNumber, brand, model, companyId, acquisitionDate, quantity, isActive
        )
        SELECT 
            @InventoryId, s.id, s.productId, s.locationId, p.sku, p.name,
            c.name, l.name, l.code, p.costValue, p.costValue, 
            CASE WHEN s.quantity > 0 THEN 'Bom' ELSE 'Indisponível' END,
            p.sku, '', '', 3, s.createdAt, s.quantity, CASE WHEN s.quantity > 0 THEN 1 ELSE 0 END
        FROM stock s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id  
        LEFT JOIN locations l ON s.locationId = l.id;
        
        COMMIT TRANSACTION;
        
        SELECT 'SUCCESS' as Result, 'Inventory data frozen successfully' as Message;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 'ERROR' as Result, ERROR_MESSAGE() as Message;
    END CATCH
END
GO

-- 12. Procedure para descongelar dados do inventário (se necessário)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UnfreezeInventoryData]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UnfreezeInventoryData]
GO

CREATE PROCEDURE sp_UnfreezeInventoryData
    @InventoryId INT,
    @UserId NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar se inventário pode ser descongelado (não deve ter contagens iniciadas)
        IF EXISTS (SELECT 1 FROM inventory_items WHERE inventoryId = @InventoryId AND (count1 IS NOT NULL OR count2 IS NOT NULL OR count3 IS NOT NULL))
        BEGIN
            SELECT 'ERROR' as Result, 'Cannot unfreeze inventory with existing counts' as Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Limpar dados congelados
        DELETE FROM inventory_categories_snapshot WHERE inventoryId = @InventoryId;
        DELETE FROM inventory_companies_snapshot WHERE inventoryId = @InventoryId;
        DELETE FROM inventory_locations_snapshot WHERE inventoryId = @InventoryId;
        DELETE FROM inventory_products_snapshot WHERE inventoryId = @InventoryId;
        DELETE FROM inventory_stock_snapshot WHERE inventoryId = @InventoryId;
        DELETE FROM inventory_stock_items_snapshot WHERE inventoryId = @InventoryId;
        
        -- Marcar inventário como não congelado
        UPDATE inventories 
        SET isFrozen = 0, frozenAt = NULL, frozenBy = NULL
        WHERE id = @InventoryId;
        
        COMMIT TRANSACTION;
        
        SELECT 'SUCCESS' as Result, 'Inventory data unfrozen successfully' as Message;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 'ERROR' as Result, ERROR_MESSAGE() as Message;
    END CATCH
END
GO

PRINT 'Database structure updated successfully for inventory data freezing!';