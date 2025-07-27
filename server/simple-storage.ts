import sql from "mssql";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
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
  Company,
  StockItem,
} from "@shared/schema";

export class SimpleStorage {
  private pool: sql.ConnectionPool;

  constructor(pool: sql.ConnectionPool) {
    this.pool = pool;
  }

  // User operations
  async createUser(userData: Omit<InsertUser, "id">): Promise<User> {
    const newUser = {
      id: nanoid(),
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = this.pool.request();
    await request
      .input("id", newUser.id)
      .input("email", newUser.email)
      .input("username", newUser.username)
      .input("password", newUser.password)
      .input("firstName", newUser.firstName || null)
      .input("lastName", newUser.lastName || null)
      .input("role", newUser.role || "user")
      .input("isActive", newUser.isActive !== false)
      .input("createdAt", new Date(newUser.createdAt))
      .input("updatedAt", new Date(newUser.updatedAt)).query(`
        INSERT INTO users (id, email, username, password, firstName, lastName, role, isActive, createdAt, updatedAt)
        VALUES (@id, @email, @username, @password, @firstName, @lastName, @role, @isActive, @createdAt, @updatedAt)
      `);

    return newUser as User;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.pool
      .request()
      .input("username", username)
      .query("SELECT * FROM users WHERE username = @username");

    if (result.recordset.length === 0) return null;

    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool
      .request()
      .input("email", email)
      .query("SELECT * FROM users WHERE email = @email");

    if (result.recordset.length === 0) return null;

    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    };
  }

  async getUser(id: string): Promise<User | null> {
    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM users WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    };
  }

  async getUsers(): Promise<User[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM users ORDER BY username");

    return result.recordset.map((user) => ({
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    }));
  }

  async getDashboardStats() {
    const [
      productsResult,
      categoriesResult,
      locationsResult,
      inventoriesResult,
    ] = await Promise.all([
      this.pool
        .request()
        .query("SELECT COUNT(*) as count FROM products WHERE isActive = 1"),
      this.pool
        .request()
        .query("SELECT COUNT(*) as count FROM categories WHERE isActive = 1"),
      this.pool
        .request()
        .query("SELECT COUNT(*) as count FROM locations WHERE isActive = 1"),
      this.pool
        .request()
        .query(
          "SELECT COUNT(*) as count FROM inventories WHERE status = 'OPEN'",
        ),
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
    const result = await this.pool
      .request()
      .query("SELECT * FROM categories ORDER BY name");
    return result.recordset.map((cat) => ({
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

    return result.recordset.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.categoryId,
      costValue: row.costValue,
      isActive: row.isActive,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      category: row.categoryName
        ? ({
            id: row.categoryId,
            name: row.categoryName,
            description: row.categoryDescription,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Category)
        : undefined,
    }));
  }

  async getProduct(id: number): Promise<Product | null> {
    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM products WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const product = result.recordset[0];
    return {
      ...product,
      createdAt: product.createdAt
        ? new Date(product.createdAt).getTime()
        : Date.now(),
      updatedAt: product.updatedAt
        ? new Date(product.updatedAt).getTime()
        : Date.now(),
    };
  }

  // Locations operations
  async getLocations(): Promise<Location[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM locations ORDER BY name");
    return result.recordset.map((loc) => ({
      ...loc,
      createdAt: loc.createdAt ? new Date(loc.createdAt).getTime() : Date.now(),
      updatedAt: loc.updatedAt ? new Date(loc.updatedAt).getTime() : Date.now(),
    }));
  }

  async getLocation(id: number): Promise<Location | null> {
    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM locations WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const location = result.recordset[0];
    return {
      ...location,
      createdAt: location.createdAt
        ? new Date(location.createdAt).getTime()
        : Date.now(),
      updatedAt: location.updatedAt
        ? new Date(location.updatedAt).getTime()
        : Date.now(),
    };
  }

  // Stock operations
  async getStock(): Promise<
    (Stock & { product?: Product; location?: Location })[]
  > {
    const result = await this.pool.request().query(`
      SELECT s.*, p.name as productName, p.sku, l.name as locationName, l.code as locationCode
      FROM stock s
      LEFT JOIN products p ON s.productId = p.id
      LEFT JOIN locations l ON s.locationId = l.id
      ORDER BY p.name, l.name
    `);

    return result.recordset.map((row) => ({
      id: row.id,
      productId: row.productId,
      locationId: row.locationId,
      quantity: row.quantity || 0,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      product: row.productName
        ? ({
            id: row.productId,
            name: row.productName,
            sku: row.sku,
            description: null,
            categoryId: null,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Product)
        : undefined,
      location: row.locationName
        ? ({
            id: row.locationId,
            name: row.locationName,
            code: row.locationCode,
            description: null,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Location)
        : undefined,
    }));
  }

  async getStockItem(id: number): Promise<Stock | null> {
    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM stock WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const stock = result.recordset[0];
    return {
      ...stock,
      createdAt: stock.createdAt
        ? new Date(stock.createdAt).getTime()
        : Date.now(),
      updatedAt: stock.updatedAt
        ? new Date(stock.updatedAt).getTime()
        : Date.now(),
    };
  }

  // Inventories operations
  async getInventories(): Promise<Inventory[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM inventories ORDER BY startDate DESC");
    return result.recordset.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).getTime() : Date.now(),
      startDate: inv.startDate ? new Date(inv.startDate).getTime() : Date.now(),
      endDate: inv.endDate ? new Date(inv.endDate).getTime() : null,
    }));
  }

  async getInventory(id: number): Promise<Inventory | null> {
    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM inventories WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: inventory.createdAt
        ? new Date(inventory.createdAt).getTime()
        : Date.now(),
      updatedAt: inventory.updatedAt
        ? new Date(inventory.updatedAt).getTime()
        : Date.now(),
      startDate: inventory.startDate
        ? new Date(inventory.startDate).getTime()
        : Date.now(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
    };
  }

  async createInventory(
    inventoryData: Omit<InsertInventory, "id">,
  ): Promise<Inventory> {
    const request = this.pool.request();
    await request
      .input("code", inventoryData.code)
      .input("typeId", inventoryData.typeId)
      .input("status", inventoryData.status || "OPEN")
      .input("startDate", new Date(inventoryData.startDate))
      .input(
        "endDate",
        inventoryData.endDate ? new Date(inventoryData.endDate) : null,
      )
      .input("description", inventoryData.description || null)
      .input("createdBy", inventoryData.createdBy)
      .input("createdAt", new Date())
      .input("updatedAt", new Date()).query(`
        INSERT INTO inventories (code, typeId, status, startDate, endDate, description, createdBy, createdAt, updatedAt)
        VALUES (@code, @typeId, @status, @startDate, @endDate, @description, @createdBy, @createdAt, @updatedAt)
      `);

    const result = await this.pool
      .request()
      .input("code", inventoryData.code)
      .query("SELECT * FROM inventories WHERE code = @code");

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
    };
  }

  async updateInventory(
    id: number,
    inventoryData: Partial<Omit<InsertInventory, "id">>,
  ): Promise<Inventory> {
    const request = this.pool.request();
    await request
      .input("id", id)
      .input("code", inventoryData.code)
      .input("typeId", inventoryData.typeId)
      .input("status", inventoryData.status)
      .input(
        "startDate",
        inventoryData.startDate ? new Date(inventoryData.startDate) : null,
      )
      .input(
        "endDate",
        inventoryData.endDate ? new Date(inventoryData.endDate) : null,
      )
      .input("description", inventoryData.description)
      .input("createdBy", inventoryData.createdBy)
      .input("updatedAt", new Date()).query(`
        UPDATE inventories 
        SET code = @code, typeId = @typeId, status = @status, startDate = @startDate, endDate = @endDate, description = @description, createdBy = @createdBy, updatedAt = @updatedAt
        WHERE id = @id
      `);

    const result = await this.pool
      .request()
      .input("id", id)
      .query("SELECT * FROM inventories WHERE id = @id");

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
    };
  }

  async closeInventory(id: number): Promise<void> {
    await this.pool
      .request()
      .input("id", id)
      .input("status", "CLOSED")
      .input("endDate", new Date())
      .input("updatedAt", new Date()).query(`
        UPDATE inventories 
        SET status = @status, endDate = @endDate, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  // Inventory Types
  async getInventoryTypes() {
    const result = await this.pool
      .request()
      .query("SELECT * FROM inventory_types WHERE isActive = 1 ORDER BY name");
    return result.recordset;
  }

  // Audit logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
    return result.recordset.map((log) => ({
      ...log,
      timestamp: log.timestamp ? new Date(log.timestamp).getTime() : Date.now(),
    }));
  }

  async logAction(log: InsertAuditLog): Promise<void> {
    await this.pool
      .request()
      .input("userId", log.userId)
      .input("action", log.action)
      .input("entityType", log.entityType)
      .input("entityId", log.entityId)
      .input("oldValues", log.oldValues ? JSON.stringify(log.oldValues) : null)
      .input("newValues", log.newValues ? JSON.stringify(log.newValues) : null)
      .input("metadata", log.metadata ? JSON.stringify(log.metadata) : null)
      .query(`
        INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
        VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, GETDATE())
      `);
  }

  // Alias for audit logging
  async createAuditLog(log: InsertAuditLog): Promise<void> {
    return this.logAction(log);
  }

  // Additional methods needed by routes
  async getInventoryTypes(): Promise<InventoryType[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM inventory_types ORDER BY name");
    return result.recordset.map((type) => ({
      ...type,
      createdAt: type.createdAt
        ? new Date(type.createdAt).getTime()
        : Date.now(),
      updatedAt: type.updatedAt
        ? new Date(type.updatedAt).getTime()
        : Date.now(),
    }));
  }

  // User management methods
  async getUsers(): Promise<User[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM users ORDER BY username");
    return result.recordset.map((user) => ({
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    }));
  }

  async getUser(id: string): Promise<User | null> {
    const result = await this.pool
      .request()
      .input("id", sql.VarChar, id)
      .query("SELECT * FROM users WHERE id = @id");

    if (result.recordset.length === 0) return null;

    const user = result.recordset[0];
    return {
      ...user,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
      updatedAt: user.updatedAt
        ? new Date(user.updatedAt).getTime()
        : Date.now(),
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await this.pool
      .request()
      .input("id", sql.VarChar, user.id || `user${Date.now()}`)
      .input("username", sql.VarChar, user.username)
      .input("email", sql.VarChar, user.email)
      .input("firstName", sql.VarChar, user.firstName)
      .input("lastName", sql.VarChar, user.lastName)
      .input("role", sql.VarChar, user.role)
      .input("isActive", sql.Bit, user.isActive)
      .input("password", sql.VarChar, hashedPassword).query(`
        INSERT INTO users (id, username, email, firstName, lastName, role, isActive, password)
        OUTPUT INSERTED.*
        VALUES (@id, @username, @email, @firstName, @lastName, @role, @isActive, @password)
      `);

    const newUser = result.recordset[0];
    return {
      ...newUser,
      createdAt: newUser.createdAt
        ? new Date(newUser.createdAt).getTime()
        : Date.now(),
      updatedAt: newUser.updatedAt
        ? new Date(newUser.updatedAt).getTime()
        : Date.now(),
    };
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const setParts = [];
    const request = this.pool.request().input("id", sql.VarChar, id);

    if (updates.username !== undefined) {
      setParts.push("username = @username");
      request.input("username", sql.VarChar, updates.username);
    }
    if (updates.email !== undefined) {
      setParts.push("email = @email");
      request.input("email", sql.VarChar, updates.email);
    }
    if (updates.firstName !== undefined) {
      setParts.push("firstName = @firstName");
      request.input("firstName", sql.VarChar, updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setParts.push("lastName = @lastName");
      request.input("lastName", sql.VarChar, updates.lastName);
    }
    if (updates.role !== undefined) {
      setParts.push("role = @role");
      request.input("role", sql.VarChar, updates.role);
    }
    if (updates.isActive !== undefined) {
      setParts.push("isActive = @isActive");
      request.input("isActive", sql.Bit, updates.isActive);
    }
    if (updates.password !== undefined) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      setParts.push("password = @password");
      request.input("password", sql.VarChar, hashedPassword);
    }

    setParts.push("updatedAt = GETDATE()");

    const result = await request.query(`
      UPDATE users 
      SET ${setParts.join(", ")}
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      throw new Error("User not found");
    }

    const updatedUser = result.recordset[0];
    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt
        ? new Date(updatedUser.createdAt).getTime()
        : Date.now(),
      updatedAt: updatedUser.updatedAt
        ? new Date(updatedUser.updatedAt).getTime()
        : Date.now(),
    };
  }

  async deleteUser(id: string): Promise<void> {
    await this.pool
      .request()
      .input("id", sql.VarChar, id)
      .query(
        "UPDATE users SET isActive = 0, updatedAt = GETDATE() WHERE id = @id",
      );
  }

  // Company management methods
  async getCompanies(): Promise<Company[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM companies ORDER BY name");
    return result.recordset.map((company) => ({
      ...company,
      createdAt: company.createdAt
        ? new Date(company.createdAt).getTime()
        : Date.now(),
      updatedAt: company.updatedAt
        ? new Date(company.updatedAt).getTime()
        : Date.now(),
    }));
  }

  // Stock Items management methods - Query with joins to get product, category and location descriptions
  async getStockItems(): Promise<StockItem[]> {
    const result = await this.pool.request().query(`
      SELECT 
        s.id,
        s.productId,
        s.locationId,
        s.quantity,
        p.sku as assetTag,
        p.name as description,
        c.name as category,
        l.name as location,
        l.code as locationCode,
        p.costValue,
        p.costValue as currentValue,
        CASE 
          WHEN s.quantity > 0 THEN 'Bom'
          ELSE 'Indisponível'
        END as condition,
        p.sku as serialNumber,
        '' as brand,
        '' as model,
        CASE WHEN s.quantity > 0 THEN 1 ELSE 0 END as isActive,
        s.createdAt,
        s.updatedAt
      FROM stock s
      LEFT JOIN products p ON s.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id  
      LEFT JOIN locations l ON s.locationId = l.id
      ORDER BY p.sku
    `);

    return result.recordset.map((item) => ({
      ...item,
      companyId: 3, // Default company based on database
      acquisitionDate: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
    }));
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM inventory_items ORDER BY id");
    return result.recordset.map((item) => ({
      ...item,
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
    }));
  }

  async getCounts(): Promise<Count[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM counts ORDER BY countedAt DESC");
    return result.recordset.map((count) => ({
      ...count,
      countedAt: count.countedAt
        ? new Date(count.countedAt).getTime()
        : Date.now(),
    }));
  }

  async createCount(countData: Omit<InsertCount, "id">): Promise<Count> {
    const request = this.pool.request();
    await request
      .input("inventoryItemId", countData.inventoryItemId)
      .input("countNumber", countData.countNumber)
      .input("quantity", countData.quantity)
      .input("countedBy", countData.countedBy)
      .input("countedAt", new Date())
      .input("notes", countData.notes || null).query(`
        INSERT INTO counts (inventoryItemId, countNumber, quantity, countedBy, countedAt, notes)
        VALUES (@inventoryItemId, @countNumber, @quantity, @countedBy, @countedAt, @notes)
      `);

    const result = await this.pool
      .request()
      .input("inventoryItemId", countData.inventoryItemId)
      .input("countNumber", countData.countNumber)
      .query(
        "SELECT * FROM counts WHERE inventoryItemId = @inventoryItemId AND countNumber = @countNumber",
      );

    const count = result.recordset[0];
    return {
      ...count,
      countedAt: new Date(count.countedAt).getTime(),
    };
  }
}
