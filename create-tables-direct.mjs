import sql from 'mssql';

const config = {
  server: '54.232.194.197',
  database: 'inventory',
  authentication: {
    type: 'default',
    options: {
      userName: 'inventario',
      password: 'Rac@2024!'
    }
  },
  options: {
    port: 1433,
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 60000,
    requestTimeout: 60000
  }
};

async function createTables() {
  console.log('Conectando ao SQL Server...');
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('Conectado com sucesso!');

  // Primeiro vamos dropar as tabelas existentes se houver
  console.log('Removendo tabelas existentes...');
  const dropQueries = [
    "IF OBJECT_ID('inventory_stock_items_snapshot', 'U') IS NOT NULL DROP TABLE inventory_stock_items_snapshot;",
    "IF OBJECT_ID('inventory_stock_snapshot', 'U') IS NOT NULL DROP TABLE inventory_stock_snapshot;",
    "IF OBJECT_ID('inventory_products_snapshot', 'U') IS NOT NULL DROP TABLE inventory_products_snapshot;",
    "IF OBJECT_ID('inventory_locations_snapshot', 'U') IS NOT NULL DROP TABLE inventory_locations_snapshot;",
    "IF OBJECT_ID('inventory_companies_snapshot', 'U') IS NOT NULL DROP TABLE inventory_companies_snapshot;",
    "IF OBJECT_ID('inventory_categories_snapshot', 'U') IS NOT NULL DROP TABLE inventory_categories_snapshot;"
  ];

  for (const query of dropQueries) {
    try {
      await pool.request().query(query);
    } catch (error) {
      console.log('Erro ao dropar tabela (pode ser que não existia):', error.message);
    }
  }

  // Criar as tabelas snapshot
  console.log('Criando tabelas snapshot...');
  const createQueries = [
    `CREATE TABLE inventory_categories_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      categoryId INT NOT NULL,
      name NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX),
      isActive BIT DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`,
    
    `CREATE TABLE inventory_companies_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      companyId INT NOT NULL,
      name NVARCHAR(255) NOT NULL,
      code NVARCHAR(100),
      cnpj NVARCHAR(18),
      isActive BIT DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`,
    
    `CREATE TABLE inventory_locations_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      locationId INT NOT NULL,
      name NVARCHAR(255) NOT NULL,
      code NVARCHAR(100),
      description NVARCHAR(MAX),
      isActive BIT DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`,
    
    `CREATE TABLE inventory_products_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      productId INT NOT NULL,
      name NVARCHAR(255) NOT NULL,
      sku NVARCHAR(100),
      description NVARCHAR(MAX),
      categoryId INT,
      costValue DECIMAL(18,2),
      isActive BIT DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`,
    
    `CREATE TABLE inventory_stock_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      stockId INT NOT NULL,
      productId INT NOT NULL,
      locationId INT NOT NULL,
      quantity DECIMAL(18,2) NOT NULL DEFAULT 0,
      minQuantity DECIMAL(18,2),
      maxQuantity DECIMAL(18,2),
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`,
    
    `CREATE TABLE inventory_stock_items_snapshot (
      id INT IDENTITY(1,1) PRIMARY KEY,
      inventoryId INT NOT NULL,
      stockItemId INT NOT NULL,
      productId INT NOT NULL,
      locationId INT NOT NULL,
      serialNumber NVARCHAR(255),
      assetTag NVARCHAR(255),
      condition NVARCHAR(50),
      costValue DECIMAL(18,2),
      acquisitionDate BIGINT,
      isActive BIT DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      snapshotCreatedAt BIGINT NOT NULL,
      FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
    );`
  ];

  for (let i = 0; i < createQueries.length; i++) {
    console.log(`Criando tabela ${i+1}/${createQueries.length}...`);
    try {
      await pool.request().query(createQueries[i]);
      console.log(`Tabela ${i+1} criada com sucesso!`);
    } catch (error) {
      console.error(`Erro na criação da tabela ${i+1}:`, error.message);
    }
  }

  // Adicionar campos de congelamento à tabela inventories
  console.log('Adicionando campos de congelamento...');
  const alterQueries = [
    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'isFrozen') ALTER TABLE inventories ADD isFrozen BIT DEFAULT 0;",
    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenAt') ALTER TABLE inventories ADD frozenAt BIGINT NULL;",
    "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenBy') ALTER TABLE inventories ADD frozenBy NVARCHAR(255) NULL;"
  ];

  for (const query of alterQueries) {
    try {
      await pool.request().query(query);
    } catch (error) {
      console.log('Erro ao alterar tabela inventories:', error.message);
    }
  }

  // Verificar se as tabelas foram criadas
  console.log('\nVerificando tabelas criadas...');
  const result = await pool.request().query(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE '%snapshot%' 
    ORDER BY TABLE_NAME
  `);
  
  console.log('Tabelas snapshot criadas:');
  result.recordset.forEach(row => console.log(`✓ ${row.TABLE_NAME}`));

  await pool.close();
  console.log('\n✅ Processo concluído com sucesso!');
}

createTables().catch(console.error);
