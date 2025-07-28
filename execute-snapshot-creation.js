const sql = require('mssql');

const config = {
  server: '54.232.194.197',
  user: 'sa',
  password: 'Rac@2024!',
  database: 'inventory',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function createTables() {
  console.log('Conectando ao SQL Server...');
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('Conectado com sucesso!');

  const queries = [
    `-- Drop existing tables if they exist
    IF OBJECT_ID('inventory_stock_items_snapshot', 'U') IS NOT NULL DROP TABLE inventory_stock_items_snapshot;
    IF OBJECT_ID('inventory_stock_snapshot', 'U') IS NOT NULL DROP TABLE inventory_stock_snapshot;
    IF OBJECT_ID('inventory_products_snapshot', 'U') IS NOT NULL DROP TABLE inventory_products_snapshot;
    IF OBJECT_ID('inventory_locations_snapshot', 'U') IS NOT NULL DROP TABLE inventory_locations_snapshot;
    IF OBJECT_ID('inventory_companies_snapshot', 'U') IS NOT NULL DROP TABLE inventory_companies_snapshot;
    IF OBJECT_ID('inventory_categories_snapshot', 'U') IS NOT NULL DROP TABLE inventory_categories_snapshot;`,
    
    `-- Create categories snapshot
    CREATE TABLE inventory_categories_snapshot (
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
    
    `-- Create companies snapshot
    CREATE TABLE inventory_companies_snapshot (
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
    
    `-- Create locations snapshot
    CREATE TABLE inventory_locations_snapshot (
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
    
    `-- Create products snapshot
    CREATE TABLE inventory_products_snapshot (
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
    
    `-- Create stock snapshot
    CREATE TABLE inventory_stock_snapshot (
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
    
    `-- Create stock items snapshot
    CREATE TABLE inventory_stock_items_snapshot (
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
    );`,
    
    `-- Add freeze fields to inventories table
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'isFrozen')
        ALTER TABLE inventories ADD isFrozen BIT DEFAULT 0;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenAt') 
        ALTER TABLE inventories ADD frozenAt BIGINT NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenBy')
        ALTER TABLE inventories ADD frozenBy NVARCHAR(255) NULL;`
  ];

  for (let i = 0; i < queries.length; i++) {
    console.log(`Executando query ${i+1}/${queries.length}...`);
    try {
      await pool.request().query(queries[i]);
      console.log(`Query ${i+1} executada com sucesso!`);
    } catch (error) {
      console.error(`Erro na query ${i+1}:`, error.message);
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
  
  console.log('Tabelas snapshot encontradas:');
  result.recordset.forEach(row => console.log(`- ${row.TABLE_NAME}`));

  await pool.close();
  console.log('Conexão fechada!');
}

createTables().catch(console.error);
