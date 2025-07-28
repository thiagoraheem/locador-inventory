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

PRINT 'Database structure updated successfully';
