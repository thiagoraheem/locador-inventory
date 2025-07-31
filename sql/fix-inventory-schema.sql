-- Fix inventories table schema to add missing columns
-- This script adds the missing columns for selectedLocationIds and selectedCategoryIds

-- Add selectedLocationIds column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedLocationIds')
BEGIN
    ALTER TABLE inventories ADD selectedLocationIds NVARCHAR(MAX) NULL;
    PRINT 'Column selectedLocationIds added to inventories table';
END
ELSE
BEGIN
    PRINT 'Column selectedLocationIds already exists in inventories table';
END

-- Add selectedCategoryIds column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedCategoryIds')
BEGIN
    ALTER TABLE inventories ADD selectedCategoryIds NVARCHAR(MAX) NULL;
    PRINT 'Column selectedCategoryIds added to inventories table';
END
ELSE
BEGIN
    PRINT 'Column selectedCategoryIds already exists in inventories table';
END

-- Add predictedEndDate column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'predictedEndDate')
BEGIN
    ALTER TABLE inventories ADD predictedEndDate DATETIME2 NULL;
    PRINT 'Column predictedEndDate added to inventories table';
END
ELSE
BEGIN
    PRINT 'Column predictedEndDate already exists in inventories table';
END

-- Add isToBlockSystem column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'isToBlockSystem')
BEGIN
    ALTER TABLE inventories ADD isToBlockSystem BIT DEFAULT 0;
    PRINT 'Column isToBlockSystem added to inventories table';
END
ELSE
BEGIN
    PRINT 'Column isToBlockSystem already exists in inventories table';
END

PRINT 'Schema update completed successfully';