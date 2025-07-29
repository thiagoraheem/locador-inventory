-- Merged SQL script for creating database tables and applying schema migrations
-- Run this script on your SQL Server database

-- Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    username NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    firstName NVARCHAR(255),
    lastName NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'user',
    isActive BIT DEFAULT 1,
    createdAt DATETIME2,
    updatedAt DATETIME2
);

-- Categories table (View)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='V')
EXEC('CREATE VIEW [dbo].[categories]
AS
select id = CodCategoria, idcompany, name = DesCategoria, description = DesCategoria, isActive = 1, createdAt = DatCadastro, updatedAt = DatAlteracao
from Locador..tbl_Categorias');
GO

-- Products table (View)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='V')
EXEC('CREATE VIEW [dbo].[products]
  AS 

  select id, sku = CodProduto, 
			name = DesResumida, 
			description = Descricao, 
			categoryId = CodCategoria, 
			costValue = VlrCusto, 
			isActive = 1, 
			createadAt = DatCadastro, 
			updatedAt = DatAlteracao,
			hasSerialControl = CAST( CASE WHEN
								(SELECT COUNT(1) FROM Locador..tbl_ProdutoSerial PS WHERE PS.CodProduto = P.CodProduto) > 0 THEN 1
								ELSE 0 END
								AS bit)
			--,qtySerial = (SELECT COUNT(1) FROM Locador..tbl_ProdutoSerial PS WHERE PS.CodProduto = P.CodProduto)
  from Locador..tbl_Produtos P;');
GO

-- Locations table (View)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='locations' AND xtype='V')
EXEC('CREATE VIEW [dbo].[locations]
  AS

  select id = CodLocalizacao, code = ''EST'' + RIGHT(''000'' + CAST(CodLocalizacao AS varchar), 3), 
		name = DesLocalizacao, description = Observacao, isActive = 1, createdAt = GETDATE(), updatedAt = GETDATE()
  from Locador..tbl_EstoqueLocalizacao;');
GO

-- Stock table (View)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock' AND xtype='V')
EXEC('CREATE VIEW [dbo].[stock]
  AS
  select id = 0, productId = B.id, locationId = CodLocalizacao, quantity = QtdEstoque, createdAt = A.DatEstoque, updatedAt = A.DatEstoque
  from Locador..tbl_Estoque A
  inner join Locador..tbl_Produtos B ON B.CodProduto = A.CodProduto;');
GO

-- Stock item table (View)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_items' AND xtype='V')
EXEC('CREATE VIEW [dbo].[stock_items]
AS

select	ES.id,
		productId = P.id, 
		locationId = ES.CodLocalizacao, 
		serialNumber = ES.NumSerie, 
		isActive = PS.FlgAtivo, 
		createdAt = PS.DatCriacao, 
		updatedAt = DataMovimento
from Locador..tbl_EstoqueSerial ES
inner join Locador..tbl_Produtos P ON P.CodProduto = ES.CodProduto
left join Locador..tbl_ProdutoSerial PS ON PS.NumSerie = ES.NumSerie;');
GO


-- Inventory types table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventory_types' AND xtype='U')
CREATE TABLE inventory_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) UNIQUE NOT NULL,
    description NVARCHAR(1000),
    isActive BIT DEFAULT 1
);

-- Inventories table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventories' AND xtype='U')
CREATE TABLE inventories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(50) UNIQUE NOT NULL,
    typeId INT NOT NULL FOREIGN KEY REFERENCES inventory_types(id),
    status NVARCHAR(50) DEFAULT 'OPEN',
    startDate DATETIME2 NOT NULL,
    endDate DATETIME2,
    description NVARCHAR(1000),
    createdBy INT NOT NULL FOREIGN KEY REFERENCES users(id),
    createdAt DATETIME2,
    updatedAt DATETIME2
);

-- Inventory items table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventory_items' AND xtype='U')
CREATE TABLE inventory_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventoryId INT NOT NULL FOREIGN KEY REFERENCES inventories(id),
    productId INT NOT NULL FOREIGN KEY REFERENCES products(id),
    locationId INT NOT NULL FOREIGN KEY REFERENCES locations(id),
    expectedQuantity REAL DEFAULT 0,
    finalQuantity REAL,
    status NVARCHAR(50) DEFAULT 'PENDING',
    createdAt DATETIME2,
    updatedAt DATETIME2,
    serialItemsCount INT DEFAULT 0,
    serialItemsFound INT DEFAULT 0,
    serialItemsMissing INT DEFAULT 0,
    hasSerialDiscrepancy BIT DEFAULT 0
);

-- Counts table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='counts' AND xtype='U')
CREATE TABLE counts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventoryItemId INT NOT NULL FOREIGN KEY REFERENCES inventory_items(id),
    countNumber INT NOT NULL,
    quantity REAL NOT NULL,
    countedBy INT NOT NULL FOREIGN KEY REFERENCES users(id),
    countedAt DATETIME2,
    notes NVARCHAR(1000)
);

-- Audit logs table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' AND xtype='U')
CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL FOREIGN KEY REFERENCES users(id),
    action NVARCHAR(255) NOT NULL,
    entityType NVARCHAR(255) NOT NULL,
    entityId NVARCHAR(255) NOT NULL,
    oldValues NVARCHAR(MAX),
    newValues NVARCHAR(MAX),
    metadata NVARCHAR(MAX),
    timestamp DATETIME2 DEFAULT GETDATE()
);

-- Sessions table for Replit Auth
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
    sid NVARCHAR(256) PRIMARY KEY,
    sess NVARCHAR(4000) NOT NULL,
    expire DATETIME2 NOT NULL
);

-- New table: inventory_serial_items from patrimonio-schema-migration.sql
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'inventory_serial_items')
BEGIN
    CREATE TABLE inventory_serial_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        stockItemId INT NOT NULL,
        serialNumber NVARCHAR(255) NOT NULL,
        productId INT NOT NULL,
        locationId INT NOT NULL,
        expectedStatus BIT DEFAULT 1, -- 1=deveria existir, 0=não deveria
        
        -- Contagens por estágio
        count1_found BIT NULL,
        count2_found BIT NULL, 
        count3_found BIT NULL,
        count4_found BIT NULL,
        
        -- Auditoria de contagens
        count1_by INT NULL,
        count2_by INT NULL,
        count3_by INT NULL,
        count4_by INT NULL,
        count1_at DATETIME2 NULL,
        count2_at DATETIME2 NULL,
        count3_at DATETIME2 NULL,
        count4_at DATETIME2 NULL,
        
        -- Status e observações
        status NVARCHAR(50) DEFAULT 'PENDING', -- PENDING, FOUND, MISSING, EXTRA
        notes NVARCHAR(1000) NULL,
        finalStatus BIT NULL, -- Status final após todas as contagens
        
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE,
        FOREIGN KEY (stockItemId) REFERENCES stock_items(id),
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (locationId) REFERENCES locations(id),
        FOREIGN KEY (count1_by) REFERENCES users(id),
        FOREIGN KEY (count2_by) REFERENCES users(id),
        FOREIGN KEY (count3_by) REFERENCES users(id),
        FOREIGN KEY (count4_by) REFERENCES users(id)
    );
END;

-- Indexes from patrimonio-schema-migration.sql
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inventory_serial_items_inventory_product')
BEGIN
    CREATE INDEX IX_inventory_serial_items_inventory_product 
    ON inventory_serial_items (inventoryId, productId);
END;
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inventory_serial_items_serial_number')
BEGIN
    CREATE INDEX IX_inventory_serial_items_serial_number 
    ON inventory_serial_items (serialNumber);
END;
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inventory_serial_items_status')
BEGIN
    CREATE INDEX IX_inventory_serial_items_status 
    ON inventory_serial_items (inventoryId, status);
END;
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_products_serial_control')
BEGIN
    CREATE INDEX IX_products_serial_control 
    ON products (hasSerialControl) WHERE hasSerialControl = 1;
END;

-- View for reconciliation from patrimonio-schema-migration.sql
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_inventory_reconciliation')
BEGIN
    EXEC('CREATE VIEW vw_inventory_reconciliation AS
    SELECT 
        ii.inventoryId,
        ii.productId,
        ii.locationId,
        p.name as productName,
        p.sku,
        l.name as locationName,
        ii.expectedQuantity,
        ii.finalQuantity,
        ii.serialItemsCount,
        ii.serialItemsFound,
        ii.serialItemsMissing,
        CASE 
            WHEN p.hasSerialControl = 1 AND ii.finalQuantity != ii.serialItemsFound 
            THEN 1 ELSE 0 
        END as hasDiscrepancy
    FROM inventory_items ii
    JOIN products p ON ii.productId = p.id
    JOIN locations l ON ii.locationId = l.id');
END;

-- Stored Procedures from patrimonio-schema-migration.sql
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateInventorySerialItems')
BEGIN
    DROP PROCEDURE sp_CreateInventorySerialItems;
END;
CREATE PROCEDURE sp_CreateInventorySerialItems
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO inventory_serial_items (
        inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
    )
    SELECT 
        @InventoryId,
        si.id,
        si.serialNumber,
        si.productId,
        si.locationId,
        1
    FROM stock_items si
    JOIN products p ON si.productId = p.id
    WHERE p.hasSerialControl = 1 
    AND si.isActive = 1;
    
    -- Atualizar contadores na inventory_items
    UPDATE ii
    SET serialItemsCount = (
        SELECT COUNT(*)
        FROM inventory_serial_items isi
        WHERE isi.inventoryId = ii.inventoryId
        AND isi.productId = ii.productId
        AND isi.locationId = ii.locationId
    )
    FROM inventory_items ii
    WHERE ii.inventoryId = @InventoryId;
END;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterSerialReading')
BEGIN
    DROP PROCEDURE sp_RegisterSerialReading;
END;
CREATE PROCEDURE sp_RegisterSerialReading
    @InventoryId INT,
    @SerialNumber NVARCHAR(255),
    @CountStage NVARCHAR(10),
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ProductId INT;
    DECLARE @LocationId INT;
    DECLARE @RowsUpdated INT;
    
    -- Verificar se série existe no inventário
    SELECT @ProductId = productId, @LocationId = locationId
    FROM inventory_serial_items 
    WHERE inventoryId = @InventoryId 
    AND serialNumber = @SerialNumber;
    
    IF @ProductId IS NULL
    BEGIN
        -- Série não encontrada no inventário esperado
        -- Verificar se existe em stock_items
        SELECT @ProductId = si.productId, @LocationId = si.locationId
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
            WHERE si.serialNumber = @SerialNumber;
        END
        ELSE
        BEGIN
            -- Série não existe no sistema - retornar erro
            RAISERROR('Número de série não encontrado no sistema', 16, 1);
            RETURN;
        END
    END
    
    -- Registrar leitura
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
        status = CASE WHEN status = 'PENDING' THEN 'FOUND' ELSE status END,
        updatedAt = GETDATE()
    WHERE inventoryId = @InventoryId 
    AND serialNumber = @SerialNumber;
    
    SET @RowsUpdated = @@ROWCOUNT;
    
    -- Atualizar contadores na inventory_items
    UPDATE ii
    SET 
        serialItemsFound = (
            SELECT COUNT(*)
            FROM inventory_serial_items isi
            WHERE isi.inventoryId = ii.inventoryId
            AND isi.productId = ii.productId
            AND isi.locationId = ii.locationId
            AND isi.status = 'FOUND'
        ),
        serialItemsMissing = (
            SELECT COUNT(*)
            FROM inventory_serial_items isi
            WHERE isi.inventoryId = ii.inventoryId
            AND isi.productId = ii.productId
            AND isi.locationId = ii.locationId
            AND isi.status = 'PENDING'
        )
    FROM inventory_items ii
    WHERE ii.inventoryId = @InventoryId
    AND ii.productId = @ProductId
    AND ii.locationId = @LocationId;
    
    -- Retornar informações da leitura
    SELECT 
        @RowsUpdated as rowsUpdated,
        @ProductId as productId,
        @LocationId as locationId,
        p.name as productName,
        p.sku as productSku
    FROM products p
    WHERE p.id = @ProductId;
END;
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ReconcileInventorySerial')
BEGIN
    DROP PROCEDURE sp_ReconcileInventorySerial;
END;
CREATE PROCEDURE sp_ReconcileInventorySerial
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Atualizar status final baseado nas contagens
    UPDATE inventory_serial_items
    SET finalStatus = CASE 
        WHEN count1_found = 1 OR count2_found = 1 OR count3_found = 1 OR count4_found = 1 
        THEN 1 ELSE 0 
    END,
    status = CASE 
        WHEN count1_found = 1 OR count2_found = 1 OR count3_found = 1 OR count4_found = 1 
        THEN 'FOUND' 
        ELSE 'MISSING' 
    END
    WHERE inventoryId = @InventoryId;
    
    -- Atualizar discrepâncias na inventory_items
    UPDATE ii
    SET hasSerialDiscrepancy = CASE 
        WHEN p.hasSerialControl = 1 AND ii.finalQuantity != ii.serialItemsFound 
        THEN 1 ELSE 0 
    END
    FROM inventory_items ii
    JOIN products p ON ii.productId = p.id
    WHERE ii.inventoryId = @InventoryId;
END;
GO

-- Insert default data
-- Default admin user
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
INSERT INTO users (email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
VALUES ('admin@example.com', 'admin', '$2b$10$D8L3Rq8K9qU8M1WvC9D4CeXqFgV8Z2K3N7P1R8S9T0U1V2W3X4Y5Z6', 'Admin', 'User', 'admin', 1, GETDATE(), GETDATE());

-- Default inventory types
IF NOT EXISTS (SELECT * FROM inventory_types WHERE name = 'Cíclico')
INSERT INTO inventory_types (name, description, isActive) VALUES ('Cíclico', 'Contagem completa do estoque', 1);

IF NOT EXISTS (SELECT * FROM inventory_types WHERE name = 'Rotativo')
INSERT INTO inventory_types (name, description, isActive) VALUES ('Rotativo', 'Contagem parcial do estoque', 1);

-- Default categories (assuming categories view is based on existing data, so no insert needed here)
-- Default locations (assuming locations view is based on existing data, so no insert needed here)
