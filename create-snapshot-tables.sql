-- Script para criar tabelas snapshot do sistema de inventário
-- Essas tabelas armazenam dados congelados para cada inventário

-- Verificar se já existem as tabelas e removê-las se necessário
IF OBJECT_ID('inventory_stock_items_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_stock_items_snapshot;

IF OBJECT_ID('inventory_stock_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_stock_snapshot;

IF OBJECT_ID('inventory_products_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_products_snapshot;

IF OBJECT_ID('inventory_locations_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_locations_snapshot;

IF OBJECT_ID('inventory_companies_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_companies_snapshot;

IF OBJECT_ID('inventory_categories_snapshot', 'U') IS NOT NULL
    DROP TABLE inventory_categories_snapshot;

-- Criar tabela snapshot para categorias
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
);

-- Criar tabela snapshot para empresas
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
);

-- Criar tabela snapshot para locais
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
);

-- Criar tabela snapshot para produtos
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
);

-- Criar tabela snapshot para estoque
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
);

-- Criar tabela snapshot para patrimônio
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
);

-- Adicionar campos de congelamento à tabela inventories se não existirem
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'isFrozen')
BEGIN
    ALTER TABLE inventories ADD isFrozen BIT DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenAt')
BEGIN
    ALTER TABLE inventories ADD frozenAt BIGINT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'frozenBy')
BEGIN
    ALTER TABLE inventories ADD frozenBy NVARCHAR(255) NULL;
END

-- Criar índices para performance
CREATE INDEX IX_inventory_categories_snapshot_inventoryId ON inventory_categories_snapshot(inventoryId);
CREATE INDEX IX_inventory_companies_snapshot_inventoryId ON inventory_companies_snapshot(inventoryId);
CREATE INDEX IX_inventory_locations_snapshot_inventoryId ON inventory_locations_snapshot(inventoryId);
CREATE INDEX IX_inventory_products_snapshot_inventoryId ON inventory_products_snapshot(inventoryId);
CREATE INDEX IX_inventory_stock_snapshot_inventoryId ON inventory_stock_snapshot(inventoryId);
CREATE INDEX IX_inventory_stock_items_snapshot_inventoryId ON inventory_stock_items_snapshot(inventoryId);

PRINT 'Tabelas snapshot criadas com sucesso!';