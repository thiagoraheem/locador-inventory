-- Add isToBlockSystem field to inventories table

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'inventories' 
    AND COLUMN_NAME = 'isToBlockSystem'
)
BEGIN
    ALTER TABLE inventories 
    ADD isToBlockSystem BIT DEFAULT 0;
    
    PRINT 'Added isToBlockSystem column to inventories table';
END
ELSE
BEGIN
    PRINT 'isToBlockSystem column already exists in inventories table';
END;