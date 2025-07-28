-- InventoryPro Database Structure Update
-- This script ensures all tables match the TypeScript schema definitions

-- Update inventories table to support new schema fields
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedLocationIds')
BEGIN
    ALTER TABLE inventories ADD selectedLocationIds NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedCategoryIds')
BEGIN
    ALTER TABLE inventories ADD selectedCategoryIds NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'predictedEndDate')
BEGIN
    ALTER TABLE inventories ADD predictedEndDate DATETIME NULL;
END

-- Ensure inventory_items table exists with correct structure
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inventory_items')
BEGIN
    CREATE TABLE inventory_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryId INT NOT NULL,
        productId INT NOT NULL,
        locationId INT NOT NULL,
        expectedQuantity DECIMAL(18,2) NOT NULL DEFAULT 0,
        count1 DECIMAL(18,2) NULL,
        count2 DECIMAL(18,2) NULL,
        count3 DECIMAL(18,2) NULL,
        count1By NVARCHAR(50) NULL,
        count2By NVARCHAR(50) NULL,
        count3By NVARCHAR(50) NULL,
        count1At DATETIME NULL,
        count2At DATETIME NULL,
        count3At DATETIME NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'pending',
        notes NVARCHAR(MAX) NULL,
        createdAt DATETIME NOT NULL DEFAULT GETDATE(),
        updatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (inventoryId) REFERENCES inventories(id),
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (locationId) REFERENCES locations(id)
    );
END

-- Update inventory status values to match schema
UPDATE inventories SET status = 'open' WHERE status = 'OPEN';
UPDATE inventories SET status = 'closed' WHERE status = 'CLOSED';
UPDATE inventories SET status = 'cancelled' WHERE status = 'CANCELLED';

-- Ensure audit_logs table supports the new schema
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
BEGIN
    CREATE TABLE audit_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId NVARCHAR(50) NOT NULL,
        action NVARCHAR(100) NOT NULL,
        entityType NVARCHAR(100) NOT NULL,
        entityId NVARCHAR(50) NOT NULL,
        oldValues NVARCHAR(MAX) NULL,
        newValues NVARCHAR(MAX) NULL,
        metadata NVARCHAR(MAX) NULL,
        timestamp BIGINT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END

-- Create counts table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'counts')
BEGIN
    CREATE TABLE counts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        inventoryItemId INT NOT NULL,
        countNumber INT NOT NULL,
        quantity DECIMAL(18,2) NOT NULL,
        countedBy NVARCHAR(50) NOT NULL,
        countedAt DATETIME NOT NULL DEFAULT GETDATE(),
        notes NVARCHAR(MAX) NULL,
        createdAt DATETIME NOT NULL DEFAULT GETDATE(),
        updatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (inventoryItemId) REFERENCES inventory_items(id)
    );
END

-- Create inventory_types table if needed
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inventory_types')
BEGIN
    CREATE TABLE inventory_types (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        isActive BIT NOT NULL DEFAULT 1
    );
    
    -- Insert default inventory types
    INSERT INTO inventory_types (name, description) VALUES 
    ('Inventário Geral', 'Inventário completo de todos os produtos'),
    ('Contagem Cíclica', 'Contagem periódica de produtos específicos'),
    ('Auditoria', 'Inventário para auditoria e verificação');
END

PRINT 'Database structure updated successfully';