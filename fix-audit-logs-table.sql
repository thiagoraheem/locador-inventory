
-- Fix audit_logs table timestamp column type
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'timestamp' AND system_type_id != 61)
BEGIN
    -- Drop existing timestamp column if it's not datetime2
    ALTER TABLE audit_logs DROP COLUMN timestamp;
    
    -- Add timestamp column as datetime2
    ALTER TABLE audit_logs ADD timestamp DATETIME2 NOT NULL DEFAULT GETDATE();
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'timestamp')
BEGIN
    -- Add timestamp column if it doesn't exist
    ALTER TABLE audit_logs ADD timestamp DATETIME2 NOT NULL DEFAULT GETDATE();
END

-- Verify the change
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'timestamp';
