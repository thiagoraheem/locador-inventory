-- Create database tables for SQL Server
-- Run this script on your SQL Server database

-- Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    username NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    firstName NVARCHAR(255),
    lastName NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'user',
    isActive BIT DEFAULT 1,
    createdAt DATETIME2,
    updatedAt DATETIME2
);

-- Categories table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='V')
CREATE VIEW [dbo].[categories]
AS
select id = CodCategoria, idcompany, name = DesCategoria, description = DesCategoria, isActive = 1, createdAt = DatCadastro, updatedAt = DatAlteracao
from Locador..tbl_Categorias
GO

-- Products table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='V')
CREATE   VIEW [dbo].[products]
  AS 

  select id, sku = CodProduto, 
			name = DesResumida, 
			description = Descricao, 
			categoryId = CodCategoria, 
			costValue = VlrCusto, 
			isActive = 1, 
			createadAt = DatCadastro, 
			updatedAt = DatAlteracao,
			hasSerialControl = CAST( CASE WHEN
								(SELECT COUNT(1) FROM Locador..tbl_ProdutoSerial PS WHERE PS.CodProduto = P.CodProduto) > 0 THEN 1
								ELSE 0 END
								AS bit)
			--,qtySerial = (SELECT COUNT(1) FROM Locador..tbl_ProdutoSerial PS WHERE PS.CodProduto = P.CodProduto)
  from Locador..tbl_Produtos P;

-- Locations table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='locations' AND xtype='V')
CREATE VIEW [dbo].[locations]
  AS

  select id = CodLocalizacao, code = 'EST' + RIGHT('000' + CAST(CodLocalizacao AS varchar), 3), 
		name = DesLocalizacao, description = Observacao, isActive = 1, createdAt = GETDATE(), updatedAt = GETDATE()
  from Locador..tbl_EstoqueLocalizacao;

-- Stock table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock' AND xtype='V')
CREATE VIEW [dbo].[stock]
  AS
  select id = 0, productId = B.id, locationId = CodLocalizacao, quantity = QtdEstoque, createdAt = A.DatEstoque, updatedAt = A.DatEstoque
  from Locador..tbl_Estoque A
  inner join Locador..tbl_Produtos B ON B.CodProduto = A.CodProduto;

-- Stock item table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock_items' AND xtype='V')
CREATE   VIEW [dbo].[stock_items]
AS

select	ES.id,
		productId = P.id, 
		locationId = ES.CodLocalizacao, 
		serialNumber = ES.NumSerie, 
		isActive = PS.FlgAtivo, 
		createdAt = PS.DatCriacao, 
		updatedAt = DataMovimento
from Locador..tbl_EstoqueSerial ES
inner join Locador..tbl_Produtos P ON P.CodProduto = ES.CodProduto
left join Locador..tbl_ProdutoSerial PS ON PS.NumSerie = ES.NumSerie
GO;


-- Inventory types table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventory_types' AND xtype='U')
CREATE TABLE inventory_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) UNIQUE NOT NULL,
    description NVARCHAR(1000),
    isActive BIT DEFAULT 1
);

-- Inventories table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventories' AND xtype='U')
CREATE TABLE inventories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(50) UNIQUE NOT NULL,
    typeId INT NOT NULL FOREIGN KEY REFERENCES inventory_types(id),
    status NVARCHAR(50) DEFAULT 'OPEN',
    startDate DATETIME2 NOT NULL,
    endDate DATETIME2,
    description NVARCHAR(1000),
    createdBy INT NOT NULL FOREIGN KEY REFERENCES users(id),
    createdAt DATETIME2,
    updatedAt DATETIME2
);

-- Inventory items table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventory_items' AND xtype='U')
CREATE TABLE inventory_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventoryId INT NOT NULL FOREIGN KEY REFERENCES inventories(id),
    productId INT NOT NULL FOREIGN KEY REFERENCES products(id),
    locationId INT NOT NULL FOREIGN KEY REFERENCES locations(id),
    expectedQuantity REAL DEFAULT 0,
    finalQuantity REAL,
    status NVARCHAR(50) DEFAULT 'PENDING',
    createdAt DATETIME2,
    updatedAt DATETIME2
);

-- Counts table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='counts' AND xtype='U')
CREATE TABLE counts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventoryItemId INT NOT NULL FOREIGN KEY REFERENCES inventory_items(id),
    countNumber INT NOT NULL,
    quantity REAL NOT NULL,
    countedBy INT NOT NULL FOREIGN KEY REFERENCES users(id),
    countedAt DATETIME2,
    notes NVARCHAR(1000)
);

-- Audit logs table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' AND xtype='U')
CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL FOREIGN KEY REFERENCES users(id),
    action NVARCHAR(255) NOT NULL,
    entityType NVARCHAR(255) NOT NULL,
    entityId NVARCHAR(255) NOT NULL,
    oldValues NVARCHAR(MAX),
    newValues NVARCHAR(MAX),
    metadata NVARCHAR(MAX),
    timestamp DATETIME2 DEFAULT GETDATE()
);

-- Sessions table for Replit Auth
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
    sid NVARCHAR(256) PRIMARY KEY,
    sess NVARCHAR(4000) NOT NULL,
    expire DATETIME2 NOT NULL
);

-- Insert default data
-- Default admin user
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
INSERT INTO users (email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
VALUES ('admin@example.com', 'admin', '$2b$10$D8L3Rq8K9qU8M1WvC9D4CeXqFgV8Z2K3N7P1R8S9T0U1V2W3X4Y5Z6', 'Admin', 'User', 'admin', 1, GETDATE(), GETDATE());

-- Default inventory types
IF NOT EXISTS (SELECT * FROM inventory_types WHERE name = 'Contagem Geral')
INSERT INTO inventory_types (name, description, isActive) VALUES ('Contagem Geral', 'Contagem completa do estoque', 1);

IF NOT EXISTS (SELECT * FROM inventory_types WHERE name = 'Contagem Cíclica')
INSERT INTO inventory_types (name, description, isActive) VALUES ('Contagem Cíclica', 'Contagem por categoria ou localização', 1);

-- Default categories
IF NOT EXISTS (SELECT * FROM categories WHERE name = 'Geral')
INSERT INTO categories (name, description, isActive, createdAt, updatedAt) VALUES ('Geral', 'Categoria geral', 1, GETDATE(), GETDATE());

-- Default locations
IF NOT EXISTS (SELECT * FROM locations WHERE code = 'EST001')
INSERT INTO locations (code, name, description, isActive, createdAt, updatedAt) VALUES ('EST001', 'Estoque Principal', 'Localização principal do estoque', 1, GETDATE(), GETDATE());