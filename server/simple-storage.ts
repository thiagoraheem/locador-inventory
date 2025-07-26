import sql from 'mssql';
import { nanoid } from 'nanoid';
import type {
  User,
  InsertUser,
  Category,
  InsertCategory,
  Product,
  InsertProduct,
  Location,
  InsertLocation,
  Stock,
  InsertStock,
  Inventory,
  InsertInventory,
  InventoryItem,
  InsertInventoryItem,
  Count,
  InsertCount,
  AuditLog,
  InsertAuditLog,
} from '@shared/schema';

export class SimpleStorage {
  private pool: sql.ConnectionPool;

  constructor(pool: sql.ConnectionPool) {
    this.pool = pool;
  }

  // User operations
  async createUser(userData: Omit<InsertUser, 'id'>): Promise<User> {
    const newUser = {
      id: nanoid(),
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = this.pool.request();
    await request
      .input('id', newUser.id)
      .input('email', newUser.email)
      .input('username', newUser.username)
      .input('password', newUser.password)
      .input('firstName', newUser.firstName || null)
      .input('lastName', newUser.lastName || null)
      .input('role', newUser.role || 'user')
      .input('isActive', newUser.isActive !== false)
      .input('createdAt', new Date(newUser.createdAt))
      .input('updatedAt', new Date(newUser.updatedAt))
      .query(`
        INSERT INTO users (id, email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
        VALUES (@id, @email, @username, @password, @firstName, @lastName, @role, @isActive, @createdAt, @updatedAt)
      `);

    return newUser as User;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.pool.request()
      .input('username', username)
      .query('SELECT * FROM users WHERE username = @username');
    
    if (result.recordset.length === 0) return null;
    
    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.request()
      .input('email', email)
      .query('SELECT * FROM users WHERE email = @email');
    
    if (result.recordset.length === 0) return null;
    
    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
    };
  }

  async getUser(id: string): Promise<User | null> {
    const result = await this.pool.request()
      .input('id', id)
      .query('SELECT * FROM users WHERE id = @id');
    
    if (result.recordset.length === 0) return null;
    
    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
    };
  }

  async getUsers(): Promise<User[]> {
    const result = await this.pool.request().query('SELECT * FROM users ORDER BY username');
    
    return result.recordset.map(user => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
    }));
  }

  async getDashboardStats() {
    const [productsResult, categoriesResult, locationsResult, inventoriesResult] = await Promise.all([
      this.pool.request().query('SELECT COUNT(*) as count FROM products WHERE isActive = 1'),
      this.pool.request().query('SELECT COUNT(*) as count FROM categories WHERE isActive = 1'),
      this.pool.request().query('SELECT COUNT(*) as count FROM locations WHERE isActive = 1'),
      this.pool.request().query("SELECT COUNT(*) as count FROM inventories WHERE status = 'OPEN'"),
    ]);

    return {
      totalProducts: productsResult.recordset[0].count,
      totalCategories: categoriesResult.recordset[0].count,
      stockLocations: locationsResult.recordset[0].count,
      activeInventories: inventoriesResult.recordset[0].count,
      lastAuditDays: 0, // Placeholder - implement audit tracking later
    };
  }

  // Categories operations
  async getCategories(): Promise<Category[]> {
    const result = await this.pool.request().query('SELECT * FROM categories ORDER BY name');
    return result.recordset.map(cat => ({
      ...cat,
      createdAt: cat.createdAt ? new Date(cat.createdAt).getTime() : Date.now(),
      updatedAt: cat.updatedAt ? new Date(cat.updatedAt).getTime() : Date.now(),
    }));
  }

  // Products operations  
  async getProducts(): Promise<(Product & { category?: Category })[]> {
    const result = await this.pool.request().query(`
      SELECT p.*, c.name as categoryName, c.description as categoryDescription
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      ORDER BY p.name
    `);
    
    return result.recordset.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.categoryId,
      isActive: row.isActive,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      category: row.categoryName ? {
        id: row.categoryId,
        name: row.categoryName,
        description: row.categoryDescription,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Category : undefined,
    }));
  }

  // Locations operations
  async getLocations(): Promise<Location[]> {
    const result = await this.pool.request().query('SELECT * FROM locations ORDER BY name');
    return result.recordset.map(loc => ({
      ...loc,
      createdAt: loc.createdAt ? new Date(loc.createdAt).getTime() : Date.now(),
      updatedAt: loc.updatedAt ? new Date(loc.updatedAt).getTime() : Date.now(),
    }));
  }

  // Stock operations
  async getStock(): Promise<(Stock & { product?: Product; location?: Location })[]> {
    const result = await this.pool.request().query(`
      SELECT s.*, p.name as productName, p.sku, l.name as locationName, l.code as locationCode
      FROM stock s
      LEFT JOIN products p ON s.productId = p.id
      LEFT JOIN locations l ON s.locationId = l.id
      ORDER BY p.name, l.name
    `);
    
    return result.recordset.map(row => ({
      id: row.id,
      productId: row.productId,
      locationId: row.locationId,
      quantity: row.quantity || 0,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      product: row.productName ? {
        id: row.productId,
        name: row.productName,
        sku: row.sku,
        description: null,
        categoryId: null,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Product : undefined,
      location: row.locationName ? {
        id: row.locationId,
        name: row.locationName,
        code: row.locationCode,
        description: null,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Location : undefined,
    }));
  }

  // Inventories operations
  async getInventories(): Promise<Inventory[]> {
    const result = await this.pool.request().query('SELECT * FROM inventories ORDER BY startDate DESC');
    return result.recordset.map(inv => ({
      ...inv,
      createdAt: inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).getTime() : Date.now(),
      startDate: inv.startDate ? new Date(inv.startDate).getTime() : Date.now(),
      endDate: inv.endDate ? new Date(inv.endDate).getTime() : null,
    }));
  }

  // Inventory Types
  async getInventoryTypes() {
    const result = await this.pool.request().query('SELECT * FROM inventory_types WHERE isActive = 1 ORDER BY name');
    return result.recordset;
  }

  // Audit logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const result = await this.pool.request().query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    return result.recordset.map(log => ({
      ...log,
      timestamp: log.timestamp ? new Date(log.timestamp).getTime() : Date.now(),
    }));
  }

  async logAction(log: InsertAuditLog): Promise<void> {
    await this.pool.request()
      .input('userId', log.userId)
      .input('action', log.action)
      .input('entityType', log.entityType)
      .input('entityId', log.entityId)
      .input('oldValues', log.oldValues ? JSON.stringify(log.oldValues) : null)
      .input('newValues', log.newValues ? JSON.stringify(log.newValues) : null)
      .input('metadata', log.metadata ? JSON.stringify(log.metadata) : null)
      .query(`
        INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
        VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, GETDATE())
      `);
  }
}