import sql from 'mssql';
import { getSqlServerPool } from './db';

export async function setupSqlServerDatabase() {
  try {
    console.log('🔗 Connecting to SQL Server...');
    const pool = await getSqlServerPool();
    
    console.log('✅ Connected to SQL Server');
    
    // Create tables script
    const createTablesScript = `
      -- Users table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
          id NVARCHAR(255) PRIMARY KEY,
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
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
      CREATE TABLE categories (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) UNIQUE NOT NULL,
          description NVARCHAR(1000),
          isActive BIT DEFAULT 1,
          createdAt DATETIME2,
          updatedAt DATETIME2
      );

      -- Products table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U')
      CREATE TABLE products (
          id INT IDENTITY(1,1) PRIMARY KEY,
          sku NVARCHAR(255) UNIQUE NOT NULL,
          name NVARCHAR(255) NOT NULL,
          description NVARCHAR(1000),
          categoryId INT,
          isActive BIT DEFAULT 1,
          createdAt DATETIME2,
          updatedAt DATETIME2,
          FOREIGN KEY (categoryId) REFERENCES categories(id)
      );

      -- Locations table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='locations' AND xtype='U')
      CREATE TABLE locations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          code NVARCHAR(50) UNIQUE NOT NULL,
          name NVARCHAR(255) NOT NULL,
          description NVARCHAR(1000),
          isActive BIT DEFAULT 1,
          createdAt DATETIME2,
          updatedAt DATETIME2
      );

      -- Stock table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='stock' AND xtype='U')
      CREATE TABLE stock (
          id INT IDENTITY(1,1) PRIMARY KEY,
          productId INT NOT NULL,
          locationId INT NOT NULL,
          quantity REAL DEFAULT 0,
          createdAt DATETIME2,
          updatedAt DATETIME2,
          FOREIGN KEY (productId) REFERENCES products(id),
          FOREIGN KEY (locationId) REFERENCES locations(id)
      );

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
          typeId INT NOT NULL,
          status NVARCHAR(50) DEFAULT 'OPEN',
          startDate DATETIME2 NOT NULL,
          endDate DATETIME2,
          description NVARCHAR(1000),
          createdBy NVARCHAR(255) NOT NULL,
          createdAt DATETIME2,
          updatedAt DATETIME2,
          FOREIGN KEY (typeId) REFERENCES inventory_types(id),
          FOREIGN KEY (createdBy) REFERENCES users(id)
      );

      -- Inventory items table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventory_items' AND xtype='U')
      CREATE TABLE inventory_items (
          id INT IDENTITY(1,1) PRIMARY KEY,
          inventoryId INT NOT NULL,
          productId INT NOT NULL,
          locationId INT NOT NULL,
          expectedQuantity REAL DEFAULT 0,
          finalQuantity REAL,
          status NVARCHAR(50) DEFAULT 'PENDING',
          createdAt DATETIME2,
          updatedAt DATETIME2,
          FOREIGN KEY (inventoryId) REFERENCES inventories(id),
          FOREIGN KEY (productId) REFERENCES products(id),
          FOREIGN KEY (locationId) REFERENCES locations(id)
      );

      -- Counts table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='counts' AND xtype='U')
      CREATE TABLE counts (
          id INT IDENTITY(1,1) PRIMARY KEY,
          inventoryItemId INT NOT NULL,
          countNumber INT NOT NULL,
          quantity REAL NOT NULL,
          countedBy NVARCHAR(255) NOT NULL,
          countedAt DATETIME2,
          notes NVARCHAR(1000),
          FOREIGN KEY (inventoryItemId) REFERENCES inventory_items(id),
          FOREIGN KEY (countedBy) REFERENCES users(id)
      );

      -- Audit logs table
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' AND xtype='U')
      CREATE TABLE audit_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          userId NVARCHAR(255) NOT NULL,
          action NVARCHAR(255) NOT NULL,
          entityType NVARCHAR(255) NOT NULL,
          entityId NVARCHAR(255) NOT NULL,
          oldValues NVARCHAR(MAX),
          newValues NVARCHAR(MAX),
          metadata NVARCHAR(MAX),
          timestamp DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES users(id)
      );

      -- Sessions table for auth
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
      CREATE TABLE sessions (
          sid NVARCHAR(256) PRIMARY KEY,
          sess NVARCHAR(4000) NOT NULL,
          expire DATETIME2 NOT NULL
      );
    `;

    console.log('📝 Creating database tables...');
    const request = pool.request();
    await request.query(createTablesScript);
    
    console.log('✅ Database tables created successfully');

    // Insert default data
    console.log('📊 Inserting default data...');
    
    // Check if admin user exists
    const adminCheck = await pool.request().query("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
    
    if (adminCheck.recordset[0].count === 0) {
      // Insert admin user with hashed password (password: "password")
      const hashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // bcrypt hash for "password"
      await pool.request().query(`
        INSERT INTO users (id, email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
        VALUES ('user1', 'admin@example.com', 'admin', '${hashedPassword}', 'Admin', 'User', 'admin', 1, GETDATE(), GETDATE())
      `);
      console.log('👤 Admin user created (username: admin, password: password)');
    }

    // Insert default inventory types
    const typeCheck = await pool.request().query("SELECT COUNT(*) as count FROM inventory_types");
    if (typeCheck.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO inventory_types (name, description, isActive) VALUES 
        ('Contagem Geral', 'Contagem completa do estoque', 1),
        ('Contagem Cíclica', 'Contagem por categoria ou localização', 1)
      `);
      console.log('📋 Default inventory types created');
    }

    // Insert default category
    const categoryCheck = await pool.request().query("SELECT COUNT(*) as count FROM categories");
    if (categoryCheck.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO categories (name, description, isActive, createdAt, updatedAt) 
        VALUES ('Geral', 'Categoria geral', 1, GETDATE(), GETDATE())
      `);
      console.log('📂 Default category created');
    }

    // Insert default location
    const locationCheck = await pool.request().query("SELECT COUNT(*) as count FROM locations");
    if (locationCheck.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO locations (code, name, description, isActive, createdAt, updatedAt) 
        VALUES ('EST001', 'Estoque Principal', 'Localização principal do estoque', 1, GETDATE(), GETDATE())
      `);
      console.log('📍 Default location created');
    }

    console.log('🎉 SQL Server database setup completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up SQL Server database:', error);
    throw error;
  }
}

// Test function
export async function testSqlServerConnection() {
  try {
    const pool = await getSqlServerPool();
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('📋 SQL Server version:', result.recordset[0].version);
    
    // Test user count
    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM users');
    console.log('👥 Users in database:', userCount.recordset[0].count);
    
    return true;
  } catch (error) {
    console.error('❌ SQL Server connection test failed:', error);
    return false;
  }
}