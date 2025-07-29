import sql from 'mssql';
import bcrypt from 'bcrypt';
import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type Location,
  type InsertLocation,
  type Stock,
  type InsertStock,
  type InventoryType,
  type InsertInventoryType,
  type Inventory,
  type InsertInventory,
  type InventoryItem,
  type InsertInventoryItem,
  type Count,
  type InsertCount,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { IStorage } from "./storage";

export class SqlServerStorage implements IStorage {
  private pool: sql.ConnectionPool;

  constructor(pool: sql.ConnectionPool) {
    this.pool = pool;
  }

  // Helper function to execute queries
  private async query<T = any>(queryText: string, params: any = {}): Promise<T[]> {
    const request = this.pool.request();

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(queryText);
    return result.recordset;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const users = await this.query<User>(
      'SELECT * FROM users WHERE id = @id',
      { id }
    );
    return users[0];
  }

  async getUsers(): Promise<User[]> {
    return this.query<User>('SELECT * FROM users ORDER BY username');
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.query<User>(
      'SELECT * FROM users WHERE username = @username',
      { username }
    );
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.query<User>(
      'SELECT * FROM users WHERE email = @email',
      { email }
    );
    return users[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const now = new Date();
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await this.query<User>(
      `INSERT INTO users (id, email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@id, @email, @username, @password, @firstName, @lastName, @role, @isActive, @createdAt, @updatedAt)`,
      {
        // id is auto-incrementing
        email: user.email,
        username: user.username,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
        isActive: user.isActive !== false,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const updates = Object.entries(user)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    const params = { id, ...user, updatedAt: new Date() };

    if (user.password) {
      params.password = await bcrypt.hash(user.password, 10);
    }

    const result = await this.query<User>(
      `UPDATE users SET ${updates}, updatedAt = @updatedAt 
       OUTPUT INSERTED.*
       WHERE id = @id`,
      params
    );
    return result[0];
  }

  async upsertUser(user: InsertUser & { id: number }): Promise<User> {
    const existing = await this.getUser(user.id);
    if (existing) {
      return this.updateUser(user.id, user);
    } else {
      return this.createUser(user);
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return this.query<Category>('SELECT * FROM categories WHERE isActive = 1 ORDER BY name');
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const categories = await this.query<Category>(
      'SELECT * FROM categories WHERE id = @id',
      { id }
    );
    return categories[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const now = new Date();
    const result = await this.query<Category>(
      `INSERT INTO categories (name, description, isActive, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @isActive, @createdAt, @updatedAt)`,
      {
        name: category.name,
        description: category.description,
        isActive: category.isActive !== false,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const updates = Object.entries(category)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    const result = await this.query<Category>(
      `UPDATE categories SET ${updates}, updatedAt = @updatedAt 
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, ...category, updatedAt: new Date() }
    );
    return result[0];
  }

  async deleteCategory(id: number): Promise<void> {
    await this.query(
      'UPDATE categories SET isActive = 0, updatedAt = @updatedAt WHERE id = @id',
      { id, updatedAt: new Date() }
    );
  }

  // Product operations
  async getProducts(search?: string, limit?: number, offset?: number, includeInactive?: boolean): Promise<Product[]> {
    let query = `
      SELECT p.*, c.name as categoryName 
      FROM products p 
      LEFT JOIN categories c ON p.categoryId = c.id
    `;

    const conditions = [];
    const params: any = {};

    if (!includeInactive) {
      conditions.push('p.isActive = 1');
    }

    if (search) {
      conditions.push('(p.name LIKE @search OR p.sku LIKE @search)');
      params.search = `%${search}%`;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.name';

    if (limit) {
      query += ` OFFSET ${offset || 0} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }

    return this.query<Product>(query, params);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const products = await this.query<Product>(
      'SELECT * FROM products WHERE id = @id',
      { id }
    );
    return products[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const now = new Date();
    const result = await this.query<Product>(
      `INSERT INTO products (sku, name, description, categoryId, isActive, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@sku, @name, @description, @categoryId, @isActive, @createdAt, @updatedAt)`,
      {
        sku: product.sku,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        isActive: product.isActive !== false,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const updates = Object.entries(product)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    const result = await this.query<Product>(
      `UPDATE products SET ${updates}, updatedAt = @updatedAt 
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, ...product, updatedAt: new Date() }
    );
    return result[0];
  }

  async deleteProduct(id: number): Promise<void> {
    await this.query(
      'UPDATE products SET isActive = 0, updatedAt = @updatedAt WHERE id = @id',
      { id, updatedAt: new Date() }
    );
  }

  // Location operations
  async getLocations(search?: string): Promise<Location[]> {
    let query = 'SELECT * FROM locations WHERE isActive = 1';
    const params: any = {};

    if (search) {
      query += ' AND (name LIKE @search OR code LIKE @search)';
      params.search = `%${search}%`;
    }

    query += ' ORDER BY name';

    return this.query<Location>(query, params);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const locations = await this.query<Location>(
      'SELECT * FROM locations WHERE id = @id',
      { id }
    );
    return locations[0];
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const now = new Date();
    const result = await this.query<Location>(
      `INSERT INTO locations (code, name, description, isActive, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@code, @name, @description, @isActive, @createdAt, @updatedAt)`,
      {
        code: location.code,
        name: location.name,
        description: location.description,
        isActive: location.isActive !== false,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location> {
    const updates = Object.entries(location)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    const result = await this.query<Location>(
      `UPDATE locations SET ${updates}, updatedAt = @updatedAt 
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, ...location, updatedAt: new Date() }
    );
    return result[0];
  }

  async deleteLocation(id: number): Promise<void> {
    await this.query(
      'UPDATE locations SET isActive = 0, updatedAt = @updatedAt WHERE id = @id',
      { id, updatedAt: new Date() }
    );
  }

  // Stock operations
  async getStock(productId?: number, locationId?: number): Promise<(Stock & { product: Product; location: Location })[]> {
    let query = `
      SELECT s.*, p.name as productName, p.sku, l.name as locationName, l.code as locationCode
      FROM stock s
      INNER JOIN products p ON s.productId = p.id
      INNER JOIN locations l ON s.locationId = l.id
      WHERE p.isActive = 1 AND l.isActive = 1
    `;

    const params: any = {};

    if (productId) {
      query += ' AND s.productId = @productId';
      params.productId = productId;
    }

    if (locationId) {
      query += ' AND s.locationId = @locationId';
      params.locationId = locationId;
    }

    query += ' ORDER BY p.name, l.name';

    return this.query(query, params);
  }

  async getStockItem(id: number): Promise<Stock | undefined> {
    const stock = await this.query<Stock>(
      'SELECT * FROM stock WHERE id = @id',
      { id }
    );
    return stock[0];
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    const now = new Date();
    const result = await this.query<Stock>(
      `INSERT INTO stock (productId, locationId, quantity, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@productId, @locationId, @quantity, @createdAt, @updatedAt)`,
      {
        productId: stock.productId,
        locationId: stock.locationId,
        quantity: stock.quantity || 0,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  async updateStock(id: number, stock: Partial<InsertStock>): Promise<Stock> {
    const updates = Object.entries(stock)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    const result = await this.query<Stock>(
      `UPDATE stock SET ${updates}, updatedAt = @updatedAt 
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, ...stock, updatedAt: new Date() }
    );
    return result[0];
  }

  async deleteStock(id: number): Promise<void> {
    await this.query('DELETE FROM stock WHERE id = @id', { id });
  }

  // Inventory type operations
  async getInventoryTypes(): Promise<InventoryType[]> {
    return this.query<InventoryType>('SELECT * FROM inventory_types WHERE isActive = 1 ORDER BY name');
  }

  async createInventoryType(type: InsertInventoryType): Promise<InventoryType> {
    const result = await this.query<InventoryType>(
      `INSERT INTO inventory_types (name, description, isActive)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @isActive)`,
      {
        name: type.name,
        description: type.description,
        isActive: type.isActive !== false
      }
    );
    return result[0];
  }

  // Inventory operations - simplified for brevity
  async getInventories(): Promise<Inventory[]> {
    return this.query<Inventory>('SELECT * FROM inventories ORDER BY createdAt DESC');
  }

  async createInventory(inventory: InsertInventory): Promise<Inventory> {
    const now = new Date();
    const result = await this.query<Inventory>(
      `INSERT INTO inventories (code, typeId, status, startDate, endDate, description, createdBy, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@code, @typeId, @status, @startDate, @endDate, @description, @createdBy, @createdAt, @updatedAt)`,
      {
        code: inventory.code,
        typeId: inventory.typeId,
        status: inventory.status || 'OPEN',
        startDate: inventory.startDate,
        endDate: inventory.endDate,
        description: inventory.description,
        createdBy: inventory.createdBy,
        createdAt: now,
        updatedAt: now
      }
    );
    return result[0];
  }

  // Additional operations would be implemented similarly...
  // For brevity, adding placeholder implementations

  async getInventory(id: number): Promise<Inventory | undefined> {
    const inventories = await this.query<Inventory>(
      'SELECT * FROM inventories WHERE id = @id',
      { id }
    );
    return inventories[0];
  }

  async updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory> {
    throw new Error("Method not implemented.");
  }

  async closeInventory(id: number): Promise<void> {
    const request = this.pool.request();
    await request
      .input('id', sql.Int, id)
      .input('endDate', sql.BigInt, Date.now())
      .query(`
        UPDATE inventories 
        SET status = 'CLOSED', endDate = @endDate
        WHERE id = @id
      `);
  }

  async cancelInventory(id: number, reason: string, userId: number): Promise<void> {
    const request = this.pool.request();
    await request
      .input('id', sql.Int, id)
      .input('reason', sql.NVarChar, reason)
      .input('endDate', sql.BigInt, Date.now())
      .query(`
        UPDATE inventories 
        SET status = 'CANCELLED', endDate = @endDate, description = CONCAT(ISNULL(description, ''), ' [CANCELADO: ', @reason, ']')
        WHERE id = @id
      `);
  }

  async deleteInventory(id: number): Promise<void> {
    const request = this.pool.request();

    // Delete related records first
    await request
      .input('id', sql.Int, id)
      .query('DELETE FROM inventory_items WHERE inventoryId = @id');

    await request
      .input('id', sql.Int, id)
      .query('DELETE FROM inventories WHERE id = @id');
  }

  async getInventoryItems(inventoryId: number): Promise<(InventoryItem & { product: Product; location: Location })[]> {
    throw new Error("Method not implemented.");
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    throw new Error("Method not implemented.");
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    throw new Error("Method not implemented.");
  }

  async getCounts(inventoryItemId: number): Promise<(Count & { countedByUser: User })[]> {
    throw new Error("Method not implemented.");
  }

  async createCount(countData: InsertCount): Promise<Count> {
    throw new Error("Method not implemented.");
  }

  async getAuditLogs(limit?: number, offset?: number): Promise<(AuditLog & { user: User })[]> {
    throw new Error("Method not implemented.");
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const now = new Date();
    const result = await this.query<AuditLog>(
      `INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
       OUTPUT INSERTED.*
       VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, @timestamp)`,
      {
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        metadata: log.metadata,
        timestamp: now
      }
    );
    return result[0];
  }

  async getDashboardStats(): Promise<{
    totalProducts: number;
    activeInventories: number;
    stockLocations: number;
    lastAuditDays: number;
  }> {
    const productCount = await this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM products WHERE isActive = 1'
    );

    const inventoryCount = await this.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM inventories WHERE status != 'CLOSED'"
    );

    const locationCount = await this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM locations WHERE isActive = 1'
    );

    return {
      totalProducts: productCount[0]?.count || 0,
      activeInventories: inventoryCount[0]?.count || 0,
      stockLocations: locationCount[0]?.count || 0,
      lastAuditDays: 0
    };
  }

  async getInventoryStats(inventoryId: number): Promise<{
    totalInventories: number;
    activeInventories: number;
    itemsInProgress: number;
    itemsCompleted: number;
    accuracyRate: number;
    divergenceCount: number;
    countingProgress: {
      count1: number;
      count2: number;
      count3: number;
      audit: number;
    };
  }> {
    const request = this.pool.request();

    // Get total items count for this inventory
    const totalItemsResult = await request
      .input('inventoryId', sql.Int, inventoryId)
      .query(`
        SELECT COUNT(*) as totalItems
        FROM inventory_items 
        WHERE inventoryId = @inventoryId
      `);

    const itemsResult = await request
      .input('inventoryId', sql.Int, inventoryId)
      .query(`
        SELECT 
          COUNT(*) as totalItems,
          COUNT(CASE WHEN count1 IS NOT NULL AND count2 IS NOT NULL THEN 1 END) as completed,
          COUNT(CASE WHEN count1 IS NULL OR count2 IS NULL THEN 1 END) as inProgress,
          COUNT(CASE WHEN count1 IS NOT NULL THEN 1 END) as count1Done,
          COUNT(CASE WHEN count2 IS NOT NULL THEN 1 END) as count2Done,
          COUNT(CASE WHEN count3 IS NOT NULL THEN 1 END) as count3Done,
          COUNT(CASE WHEN count4 IS NOT NULL THEN 1 END) as count4Done,
          COUNT(CASE WHEN count1 IS NOT NULL AND count2 IS NOT NULL AND count1 != count2 THEN 1 END) as divergences
        FROM inventory_items 
        WHERE inventoryId = @inventoryId
      `);

    const stats = itemsResult.recordset[0];
    const totalItems = stats.totalItems || 0;
    const completed = stats.completed || 0;
    const inProgress = totalItems - completed;

    // Calculate accuracy rate based on matches between counts
    let accuracyRate = 0;
    if (totalItems > 0 && completed > 0) {
      const accurateItems = completed - (stats.divergences || 0);
      accuracyRate = (accurateItems / completed) * 100;
    }

    return {
      totalInventories: 1,
      activeInventories: 1,
      itemsInProgress: inProgress,
      itemsCompleted: completed,
      accuracyRate: Math.round(accuracyRate * 10) / 10, // Round to 1 decimal place
      divergenceCount: stats.divergences || 0,
      countingProgress: {
        count1: stats.count1Done || 0,
        count2: stats.count2Done || 0,
        count3: stats.count3Done || 0,
        audit: stats.count4Done || 0
      }
    };
  }
}