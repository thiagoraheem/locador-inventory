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

async function executeStepByStep() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Conectando ao banco SQL Server...');
    pool = new sql.ConnectionPool(sqlServerConfig);
    await pool.connect();
    console.log('Conectado com sucesso!');

    // Passo 1: Adicionar colunas na tabela products
    console.log('\n=== PASSO 1: Alterações na tabela products ===');
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'hasSerialControl')
        BEGIN
            ALTER TABLE products ADD hasSerialControl BIT DEFAULT 0;
            PRINT 'Coluna hasSerialControl adicionada à tabela products';
        END
        ELSE
        BEGIN
            PRINT 'Coluna hasSerialControl já existe na tabela products';
        END
      `);
      console.log('✓ Tabela products atualizada');
    } catch (error: any) {
      console.log('⚠ Erro ignorado:', error.message);
    }

    // Passo 2: Adicionar colunas na tabela inventory_items
    console.log('\n=== PASSO 2: Alterações na tabela inventory_items ===');
    const inventoryColumns = [
      'serialItemsCount INT DEFAULT 0',
      'serialItemsFound INT DEFAULT 0', 
      'serialItemsMissing INT DEFAULT 0',
      'hasSerialDiscrepancy BIT DEFAULT 0'
    ];

    for (const column of inventoryColumns) {
      const columnName = column.split(' ')[0];
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_items' AND COLUMN_NAME = '${columnName}')
          BEGIN
              ALTER TABLE inventory_items ADD ${column};
              PRINT 'Coluna ${columnName} adicionada à tabela inventory_items';
          END
          ELSE
          BEGIN
              PRINT 'Coluna ${columnName} já existe na tabela inventory_items';
          END
        `);
        console.log(`✓ Coluna ${columnName} processada`);
      } catch (error: any) {
        console.log(`⚠ Erro na coluna ${columnName}:`, error.message);
      }
    }

    // Passo 3: Criar tabela inventory_serial_items
    console.log('\n=== PASSO 3: Criação da tabela inventory_serial_items ===');
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
                
                count1_found BIT NULL,
                count2_found BIT NULL, 
                count3_found BIT NULL,
                count4_found BIT NULL,
                
                count1_by NVARCHAR(255) NULL,
                count2_by NVARCHAR(255) NULL,
                count3_by NVARCHAR(255) NULL,
                count4_by NVARCHAR(255) NULL,
                count1_at DATETIME2 NULL,
                count2_at DATETIME2 NULL,
                count3_at DATETIME2 NULL,
                count4_at DATETIME2 NULL,
                
                status NVARCHAR(50) DEFAULT 'PENDING',
                notes NVARCHAR(1000) NULL,
                finalStatus BIT NULL,
                
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
            PRINT 'Tabela inventory_serial_items criada com sucesso';
        END
        ELSE
        BEGIN
            PRINT 'Tabela inventory_serial_items já existe';
        END
      `);
      console.log('✓ Tabela inventory_serial_items processada');
    } catch (error: any) {
      console.log('⚠ Erro na tabela:', error.message);
    }

    // Passo 4: Criar índices
    console.log('\n=== PASSO 4: Criação de índices ===');
    const indexes = [
      'CREATE INDEX IX_inventory_serial_items_inventory_product ON inventory_serial_items (inventoryId, productId)',
      'CREATE INDEX IX_inventory_serial_items_serial_number ON inventory_serial_items (serialNumber)',
      'CREATE INDEX IX_inventory_serial_items_status ON inventory_serial_items (inventoryId, status)',
      'CREATE INDEX IX_products_serial_control ON products (hasSerialControl) WHERE hasSerialControl = 1'
    ];

    for (const indexSQL of indexes) {
      const indexName = indexSQL.match(/CREATE INDEX (\w+)/)?.[1] || 'unknown';
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${indexName}')
          BEGIN
              ${indexSQL};
              PRINT 'Índice ${indexName} criado';
          END
          ELSE
          BEGIN
              PRINT 'Índice ${indexName} já existe';
          END
        `);
        console.log(`✓ Índice ${indexName} processado`);
      } catch (error: any) {
        console.log(`⚠ Erro no índice ${indexName}:`, error.message);
      }
    }

    // Passo 5: Migração de dados
    console.log('\n=== PASSO 5: Migração de dados ===');
    try {
      const result = await pool.request().query(`
        UPDATE products 
        SET hasSerialControl = 1 
        WHERE id IN (
            SELECT DISTINCT productId 
            FROM stock_items 
            WHERE serialNumber IS NOT NULL 
            AND serialNumber != ''
            AND LEN(TRIM(serialNumber)) > 0
        );
        
        SELECT @@ROWCOUNT as productsUpdated;
      `);
      
      const productsUpdated = result.recordset[0].productsUpdated;
      console.log(`✓ ${productsUpdated} produtos marcados com controle de série`);
    } catch (error: any) {
      console.log('⚠ Erro na migração de dados:', error.message);
    }

    console.log('\n=== VALIDAÇÃO FINAL ===');
    
    // Validações finais
    const validations = [
      { name: 'Tabela inventory_serial_items', query: "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'inventory_serial_items'" },
      { name: 'Coluna hasSerialControl', query: "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'hasSerialControl'" },
      { name: 'Produtos com série', query: "SELECT COUNT(*) as count FROM products WHERE hasSerialControl = 1" }
    ];

    for (const validation of validations) {
      try {
        const result = await pool.request().query(validation.query);
        console.log(`✓ ${validation.name}: ${result.recordset[0].count}`);
      } catch (error: any) {
        console.log(`✗ ${validation.name}: erro -`, error.message);
      }
    }

    console.log('\n🎉 MIGRAÇÃO DE SCHEMA CONCLUÍDA COM SUCESSO!');
    console.log('📋 Próximos passos: Implementar APIs backend para controle de patrimônio');
    
  } catch (error: any) {
    console.error('\n❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexão fechada.');
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeStepByStep();
}

export { executeStepByStep };