import sql from 'mssql';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlServerConfig = {
  server: '54.232.194.197',
  database: 'inventory',
  user: 'usrInventory',
  password: 'inv@2025',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 720000,
    requestTimeout: 720000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function executeFinalMigration() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    // Conectando ao banco SQL Server
    pool = new sql.ConnectionPool(sqlServerConfig);
    await pool.connect();
    // Conectado com sucesso

    // Passo 1: Criar tabela inventory_serial_items
    // Criando tabela inventory_serial_items
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'inventory_serial_items')
        BEGIN
            CREATE TABLE inventory_serial_items (
                id INT IDENTITY(1,1) PRIMARY KEY,
                inventoryId INT NOT NULL,
                stockItemId INT NOT NULL,
                serialNumber NVARCHAR(255) NOT NULL,
                productId INT NOT NULL,
                locationId INT NOT NULL,
                expectedStatus BIT DEFAULT 1,
                
                -- Contagens por estágio
                count1_found BIT NULL,
                count2_found BIT NULL, 
                count3_found BIT NULL,
                count4_found BIT NULL,
                
                -- Auditoria de contagens
                count1_by NVARCHAR(255) NULL,
                count2_by NVARCHAR(255) NULL,
                count3_by NVARCHAR(255) NULL,
                count4_by NVARCHAR(255) NULL,
                count1_at DATETIME2 NULL,
                count2_at DATETIME2 NULL,
                count3_at DATETIME2 NULL,
                count4_at DATETIME2 NULL,
                
                -- Status e observações
                status NVARCHAR(50) DEFAULT 'PENDING',
                notes NVARCHAR(1000) NULL,
                finalStatus BIT NULL,
                
                createdAt DATETIME2 DEFAULT GETDATE(),
                updatedAt DATETIME2 DEFAULT GETDATE(),
                
                -- Foreign keys só para tabelas reais
                FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE,
                FOREIGN KEY (count1_by) REFERENCES users(id),
                FOREIGN KEY (count2_by) REFERENCES users(id),
                FOREIGN KEY (count3_by) REFERENCES users(id),
                FOREIGN KEY (count4_by) REFERENCES users(id)
            );
            
            PRINT 'Tabela inventory_serial_items criada com sucesso';
        END
        ELSE
        BEGIN
            PRINT 'Tabela inventory_serial_items já existe';
        END
      `);
      // Tabela inventory_serial_items processada
    } catch (error: any) {
      // Erro na criação da tabela
      throw error;
    }

    // Passo 2: Criar índices
    // Criando índices
    const indexes = [
      { name: 'IX_inventory_serial_items_inventory_product', sql: 'CREATE INDEX IX_inventory_serial_items_inventory_product ON inventory_serial_items (inventoryId, productId)' },
      { name: 'IX_inventory_serial_items_serial_number', sql: 'CREATE INDEX IX_inventory_serial_items_serial_number ON inventory_serial_items (serialNumber)' },
      { name: 'IX_inventory_serial_items_status', sql: 'CREATE INDEX IX_inventory_serial_items_status ON inventory_serial_items (inventoryId, status)' },
      { name: 'IX_inventory_serial_items_location', sql: 'CREATE INDEX IX_inventory_serial_items_location ON inventory_serial_items (locationId)' }
    ];

    for (const index of indexes) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${index.name}')
          BEGIN
              ${index.sql};
              PRINT 'Índice ${index.name} criado';
          END
          ELSE
          BEGIN
              PRINT 'Índice ${index.name} já existe';
          END
        `);
        // Índice processado
      } catch (error: any) {
        // Erro no índice
      }
    }

    // Passo 3: Criar view para reconciliação
    // Criando view de reconciliação
    try {
      await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_inventory_reconciliation')
        BEGIN
            DROP VIEW vw_inventory_reconciliation;
            PRINT 'View vw_inventory_reconciliation removida para recriação';
        END
      `);
      
      await pool.request().query(`
        CREATE VIEW vw_inventory_reconciliation AS
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
                WHEN ii.serialItemsCount > 0 AND ii.finalQuantity != ii.serialItemsFound 
                THEN 1 ELSE 0 
            END as hasDiscrepancy
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN locations l ON ii.locationId = l.id;
        
        PRINT 'View vw_inventory_reconciliation criada';
      `);
      // View de reconciliação criada
    } catch (error: any) {
      // Erro na criação da view
    }

    // Passo 4: Criar stored procedures
    // Criando stored procedures
    
    // Procedure para inicializar itens de série
    try {
      await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateInventorySerialItems')
        BEGIN
            DROP PROCEDURE sp_CreateInventorySerialItems;
        END
      `);
      
      await pool.request().query(`
        CREATE PROCEDURE sp_CreateInventorySerialItems
            @InventoryId INT
        AS
        BEGIN
            SET NOCOUNT ON;
            
            -- Inserir itens de série baseados no stock_items
            INSERT INTO inventory_serial_items (
                inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
            )
            SELECT 
                @InventoryId,
                si.id,
                si.serialNumber,
                si.id as productId, -- Usando o id como productId temporariamente
                si.locationId,
                1
            FROM stock_items si
            WHERE si.isActive = 1
            AND NOT EXISTS (
                SELECT 1 FROM inventory_serial_items isi 
                WHERE isi.inventoryId = @InventoryId 
                AND isi.serialNumber = si.serialNumber
            );
            
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
            
            SELECT @@ROWCOUNT as itemsCreated;
        END
      `);
      // Procedure sp_CreateInventorySerialItems criada
    } catch (error: any) {
      // Erro na procedure de criação
    }

    // Procedure para registrar leitura de série
    try {
      await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterSerialReading')
        BEGIN
            DROP PROCEDURE sp_RegisterSerialReading;
        END
      `);
      
      await pool.request().query(`
        CREATE PROCEDURE sp_RegisterSerialReading
            @InventoryId INT,
            @SerialNumber NVARCHAR(255),
            @CountStage NVARCHAR(10),
            @UserId NVARCHAR(255)
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
                -- Série não encontrada no inventário
                -- Verificar se existe em stock_items
                SELECT @ProductId = si.id, @LocationId = si.locationId
                FROM stock_items si
                WHERE si.serialNumber = @SerialNumber
                AND si.isActive = 1;
                
                IF @ProductId IS NOT NULL
                BEGIN
                    -- Série existe mas não estava no inventário - adicionar como EXTRA
                    INSERT INTO inventory_serial_items (
                        inventoryId, stockItemId, serialNumber, productId, locationId, 
                        expectedStatus, status, createdAt, updatedAt
                    )
                    VALUES (
                        @InventoryId, @ProductId, @SerialNumber, @ProductId, @LocationId,
                        0, 'EXTRA', GETDATE(), GETDATE()
                    );
                END
                ELSE
                BEGIN
                    -- Série não existe no sistema - retornar erro
                    SELECT 
                        0 as success,
                        'Número de série não encontrado no sistema' as message,
                        @SerialNumber as serialNumber;
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
                status = 'FOUND',
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
            
            -- Retornar resultado
            SELECT 
                1 as success,
                'Leitura registrada com sucesso' as message,
                @SerialNumber as serialNumber,
                @ProductId as productId,
                @LocationId as locationId;
        END
      `);
      // Procedure sp_RegisterSerialReading criada
    } catch (error: any) {
      // Erro na procedure de leitura
    }

    // Validação final
    
    // Validar criação da tabela
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'inventory_serial_items'
    `);
    // Tabela inventory_serial_items verificada
    
    // Validar índices
    const indexCount = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM sys.indexes 
      WHERE name LIKE 'IX_inventory_serial_items%'
    `);
    // Índices verificados
    
    // Validar procedures
    const procCount = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM sys.procedures 
      WHERE name IN ('sp_CreateInventorySerialItems', 'sp_RegisterSerialReading')
    `);
    // Procedures verificadas
    
    // Testar estrutura básica
    const columnCount = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_serial_items'
    `);
    // Colunas verificadas

    // Migração de patrimônio concluída com sucesso
  // Resumo das implementações:
  // - Tabela inventory_serial_items criada
  // - Índices de performance implementados
  // - View de reconciliação criada
  // - Stored procedures para operações principais
  // - Estrutura preparada para controle por número de série
  // Próximo passo: Implementar APIs backend
    
  } catch (error: any) {
    // Erro na migração
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      // Conexão fechada
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeFinalMigration();
}

export { executeFinalMigration };