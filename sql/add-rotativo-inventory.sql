-- Add selectedProductIds field to inventories table and create Rotativo inventory type
-- Run this script on your SQL Server database

-- Add selectedProductIds column to inventories table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventories' AND COLUMN_NAME = 'selectedProductIds')
BEGIN
    ALTER TABLE inventories ADD selectedProductIds NVARCHAR(MAX);
END

-- Add selectedLocationIds column to inventories table (if not exists)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventories' AND COLUMN_NAME = 'selectedLocationIds')
BEGIN
    ALTER TABLE inventories ADD selectedLocationIds NVARCHAR(MAX);
END

-- Add selectedCategoryIds column to inventories table (if not exists)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventories' AND COLUMN_NAME = 'selectedCategoryIds')
BEGIN
    ALTER TABLE inventories ADD selectedCategoryIds NVARCHAR(MAX);
END

-- Add isToBlockSystem column to inventories table (if not exists)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventories' AND COLUMN_NAME = 'isToBlockSystem')
BEGIN
    ALTER TABLE inventories ADD isToBlockSystem BIT DEFAULT 0;
END

-- Add predictedEndDate column to inventories table (if not exists)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventories' AND COLUMN_NAME = 'predictedEndDate')
BEGIN
    ALTER TABLE inventories ADD predictedEndDate DATETIME2;
END

-- Insert Rotativo inventory type if it doesn't exist
IF NOT EXISTS (SELECT * FROM inventory_types WHERE name = 'Rotativo')
BEGIN
    INSERT INTO inventory_types (name, description, isActive) 
    VALUES ('Rotativo', 'Inventário rotativo com seleção específica de produtos dentro das categorias', 1);
END

PRINT 'Rotativo inventory functionality database changes applied successfully.';