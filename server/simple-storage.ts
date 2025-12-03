import sql from "mssql";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { logger } from "./utils/logger";
import type {
  User,
  InsertUser,
  Category,
  Product,
  Location,
  Stock,
  Inventory,
  InsertInventory,
  InventoryItem,
  InsertInventoryItem,
  InventoryStockItem,
  InsertInventoryStockItem,
  Count,
  InsertCount,
  AuditLog,
  InsertAuditLog,
  Company,
  StockItem,
  ControlPanelStats,
  InventoryFinalReport,
  InventoryStatus,
  InventorySerialItem,
  ProductWithSerialControl,
  SerialReadingRequest,
  SerialReadingResponse,
} from "@shared/schema";

  export class SimpleStorage {
    public pool: sql.ConnectionPool;

    constructor(pool: sql.ConnectionPool) {
      this.pool = pool;
    }

  // User operations

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.pool
      .request()
      .input("username", username)
      .query("SELECT * FROM users WHERE username = @username");

    if (result.recordset.length === 0) return null;

    const user = { ...result.recordset[0], id: Number(result.recordset[0].id) };
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

    const user = { ...result.recordset[0], id: Number(result.recordset[0].id) };
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

  async getUser(id: number): Promise<User | null> {
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
      partNumber: row.partNumber,
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

  async getLocationsByIds(locationIds: number[]): Promise<Array<{id: number, name: string}>> {
    if (!locationIds || locationIds.length === 0) return [];
    
    const placeholders = locationIds.map((_, index) => `@id${index}`).join(',');
    const request = this.pool.request();
    
    locationIds.forEach((id, index) => {
      request.input(`id${index}`, id);
    });
    
    const result = await request.query(`
      SELECT id, name 
      FROM locations 
      WHERE id IN (${placeholders}) AND isActive = 1
      ORDER BY name
    `);
    
    return result.recordset;
  }

  async getCategoriesByIds(categoryIds: number[]): Promise<Array<{id: number, name: string}>> {
    if (!categoryIds || categoryIds.length === 0) return [];
    
    const placeholders = categoryIds.map((_, index) => `@id${index}`).join(',');
    const request = this.pool.request();
    
    categoryIds.forEach((id, index) => {
      request.input(`id${index}`, id);
    });
    
    const result = await request.query(`
      SELECT id, name 
      FROM categories 
      WHERE id IN (${placeholders}) AND isActive = 1
      ORDER BY name
    `);
    
    return result.recordset;
  }

  async getProductsByCategories(categoryIds: number[]): Promise<Product[]> {
    if (!categoryIds || categoryIds.length === 0) return [];
    
    const placeholders = categoryIds.map((_, index) => `@categoryId${index}`).join(',');
    const request = this.pool.request();
    
    categoryIds.forEach((id, index) => {
      request.input(`categoryId${index}`, id);
    });
    
    const queryText = `
      SELECT p.*, c.name as categoryName, c.description as categoryDescription
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.categoryId IN (${placeholders}) AND p.isActive = 1
      ORDER BY p.name
    `;

    const result = await request.query(queryText);

    logger.debug('Query executed:', queryText);
    logger.debug('Category IDs:', categoryIds);
    logger.debug('Result count:', result.recordset.length);

    return result.recordset.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.categoryId,
      costValue: row.costValue,
      partNumber: row.partNumber,
      isActive: row.isActive,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      category: row.categoryName ? {
        id: row.categoryId,
        name: row.categoryName,
        description: row.categoryDescription,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } : undefined
    }));
  }

  // Stock operations
  async getStock(productId?: number, locationId?: number): Promise<
    (Stock & { product?: Product; location?: Location })[]
  > {
    const request = this.pool.request();
    let whereClause = '';
    const conditions: string[] = [];

    if (productId !== undefined) {
      conditions.push('s.productId = @productId');
      request.input('productId', sql.Int, productId);
    }

    if (locationId !== undefined) {
      conditions.push('s.locationId = @locationId');
      request.input('locationId', sql.Int, locationId);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT s.*, p.name as productName, p.sku, CAST(l.sequence AS varchar) + l.name as locationName, l.code as locationCode
      FROM stock s
      LEFT JOIN products p ON s.productId = p.id
      LEFT JOIN locations l ON s.locationId = l.id
      ${whereClause}
      ORDER BY p.name, l.name
    `;

    console.log('SimpleStorage getStock SQL:', query);
    console.log('SimpleStorage getStock params:', { productId, locationId });

    const result = await request.query(query);

    console.log('SimpleStorage getStock result count:', result.recordset.length);

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
            description: undefined,
            categoryId: undefined,
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
            description: undefined,
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
  async getInventories() {
    const result = await this.pool.request().query(`
      SELECT i.*, 
             it.name as typeName, 
             it.description as typeDescription,
             u.firstName, u.lastName, u.email as createdByEmail
      FROM inventories i
      LEFT JOIN inventory_types it ON i.typeId = it.id
      LEFT JOIN users u ON i.createdBy = u.id
      ORDER BY i.createdAt DESC
    `);

    return result.recordset.map((inventory) => ({
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
      predictedEndDate: inventory.predictedEndDate
        ? new Date(inventory.predictedEndDate).getTime()
        : null,
      type: {
        id: inventory.typeId,
        name: inventory.typeName,
        description: inventory.typeDescription,
      },
      createdByUser: {
        firstName: inventory.firstName,
        lastName: inventory.lastName,
        email: inventory.createdByEmail,
      },
      selectedLocationIds: inventory.selectedLocationIds
        ? JSON.parse(inventory.selectedLocationIds)
        : null,
      selectedCategoryIds: inventory.selectedCategoryIds
        ? JSON.parse(inventory.selectedCategoryIds)
        : null,
    }));
  }

  async getInventory(id: number) {
    const result = await this.pool.request().input("id", sql.Int, id).query(`
        SELECT i.*, 
               it.name as typeName, 
               it.description as typeDescription,
               u.firstName, u.lastName, u.email as createdByEmail
        FROM inventories i
        LEFT JOIN inventory_types it ON i.typeId = it.id
        LEFT JOIN users u ON i.createdBy = u.id
        WHERE i.id = @id
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
      predictedEndDate: inventory.predictedEndDate
        ? new Date(inventory.predictedEndDate).getTime()
        : null,
      type: {
        id: inventory.typeId,
        name: inventory.typeName,
        description: inventory.typeDescription,
      },
      createdByUser: {
        firstName: inventory.firstName,
        lastName: inventory.lastName,
        email: inventory.createdByEmail,
      },
      selectedLocationIds: inventory.selectedLocationIds
        ? JSON.parse(inventory.selectedLocationIds)
        : null,
      selectedCategoryIds: inventory.selectedCategoryIds
        ? JSON.parse(inventory.selectedCategoryIds)
        : null,
    };
  }

  async createInventory(
    inventoryData: Omit<InsertInventory, "id">,
  ): Promise<Inventory> {
    const request = this.pool.request();

    // Handle optional fields with proper types
    const selectedLocationIds = inventoryData.selectedLocationIds
      ? JSON.stringify(inventoryData.selectedLocationIds)
      : null;
    const selectedCategoryIds = inventoryData.selectedCategoryIds
      ? JSON.stringify(inventoryData.selectedCategoryIds)
      : null;
    const predictedEndDate = inventoryData.predictedEndDate
      ? typeof inventoryData.predictedEndDate === "number"
        ? new Date(inventoryData.predictedEndDate)
        : new Date(inventoryData.predictedEndDate)
      : null;

    await request
      .input("code", inventoryData.code)
      .input("typeId", inventoryData.typeId)
      .input("status", inventoryData.status || "open")
      .input(
        "startDate",
        typeof inventoryData.startDate === "number"
          ? new Date(inventoryData.startDate)
          : new Date(inventoryData.startDate),
      )
      .input(
        "endDate",
        inventoryData.endDate
          ? typeof inventoryData.endDate === "number"
            ? new Date(inventoryData.endDate)
            : new Date(inventoryData.endDate)
          : null,
      )
      .input("predictedEndDate", predictedEndDate)
      .input("description", inventoryData.description || null)
      .input("selectedLocationIds", selectedLocationIds)
      .input("selectedCategoryIds", selectedCategoryIds)
      .input("isToBlockSystem", inventoryData.isToBlockSystem === true)
      .input("createdBy", inventoryData.createdBy)
      .input("createdAt", new Date())
      .input("updatedAt", new Date()).query(`
        INSERT INTO inventories (code, typeId, status, startDate, endDate, predictedEndDate, description, selectedLocationIds, selectedCategoryIds, isToBlockSystem, createdBy, createdAt, updatedAt)
        VALUES (@code, @typeId, @status, @startDate, @endDate, @predictedEndDate, @description, @selectedLocationIds, @selectedCategoryIds, @isToBlockSystem, @createdBy, @createdAt, @updatedAt)
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
      predictedEndDate: inventory.predictedEndDate
        ? new Date(inventory.predictedEndDate).getTime()
        : null,
      selectedLocationIds: inventory.selectedLocationIds
        ? JSON.parse(inventory.selectedLocationIds)
        : null,
      selectedCategoryIds: inventory.selectedCategoryIds
        ? JSON.parse(inventory.selectedCategoryIds)
        : null,
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
    const request = this.pool.request();
    await request
      .input("id", sql.Int, id)
      .input("endDate", sql.BigInt, Date.now()).query(`
        UPDATE inventories 
        SET status = 'CLOSED', endDate = @endDate
        WHERE id = @id
      `);
  }

  async closeInventoryWithEndDate(
    inventoryId: number,
    userId: number,
  ): Promise<void> {
    const request = this.pool.request();
    const endDate = Date.now();

    await request
      .input("id", sql.Int, inventoryId)
      .input("status", sql.NVarChar, "closed")
      .input("endDate", sql.BigInt, endDate)
      .input("updatedAt", sql.DateTime, new Date()).query(`
        UPDATE inventories 
        SET status = @status, endDate = @endDate, updatedAt = @updatedAt
        WHERE id = @id
      `);

    // Log the inventory closure
    await this.createAuditLog({
      userId,
      action: "INVENTORY_CLOSED",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      newValues: JSON.stringify({
        status: "closed",
        endDate: endDate,
        closedAt: new Date().toISOString(),
      }),
      metadata: JSON.stringify({
        timestamp: Date.now(),
        closedBy: userId,
      }),
    });
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

  // Fix inventory schema method
  async fixInventorySchema(): Promise<void> {
    const schemaFixes = `
      -- Add selectedLocationIds column if it doesn't exist
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedLocationIds')
      BEGIN
          ALTER TABLE inventories ADD selectedLocationIds NVARCHAR(MAX) NULL;
          PRINT 'Column selectedLocationIds added to inventories table';
      END

      -- Add selectedCategoryIds column if it doesn't exist
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedCategoryIds')
      BEGIN
          ALTER TABLE inventories ADD selectedCategoryIds NVARCHAR(MAX) NULL;
          PRINT 'Column selectedCategoryIds added to inventories table';
      END

      -- Add predictedEndDate column if it doesn't exist
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'predictedEndDate')
      BEGIN
          ALTER TABLE inventories ADD predictedEndDate DATETIME2 NULL;
          PRINT 'Column predictedEndDate added to inventories table';
      END

      -- Add isToBlockSystem column if it doesn't exist
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'isToBlockSystem')
      BEGIN
          ALTER TABLE inventories ADD isToBlockSystem BIT DEFAULT 0;
          PRINT 'Column isToBlockSystem added to inventories table';
      END
    `;

    await this.pool.request().query(schemaFixes);
    // Inventory schema fixed successfully
  }

  async createUser(user: InsertUser): Promise<User> {
    // Check if username already exists
    const existingUser = await this.pool
      .request()
      .input("username", sql.VarChar, user.username)
      .query("SELECT id FROM users WHERE username = @username");

    if (existingUser.recordset.length > 0) {
      throw new Error("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    // ID will be auto-generated by the database

    const result = await this.pool
      .request()
      // ID is auto-generated by the database
      .input("username", sql.VarChar, user.username)
      .input("email", sql.VarChar, user.email)
      .input("firstName", sql.VarChar, user.firstName)
      .input("lastName", sql.VarChar, user.lastName)
      .input("role", sql.VarChar, user.role)
      .input("isActive", sql.Bit, user.isActive ?? true)
      .input("password", sql.VarChar, hashedPassword)
      .input("createdAt", sql.DateTime, new Date())
      .input("updatedAt", sql.DateTime, new Date()).query(`
        INSERT INTO users (username, email, firstName, lastName, role, isActive, password, createdAt, updatedAt)
        OUTPUT INSERTED.*
        VALUES (@username, @email, @firstName, @lastName, @role, @isActive, @password, @createdAt, @updatedAt)
      `);

    const newUser = result.recordset[0];

    // Create audit log without problematic parameters
    await this.createAuditLog({
      userId: newUser.id,
      entityType: "User",
      entityId: newUser.id,
      action: "CREATE",
      oldValues: "",
      newValues: "User created",
    });

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

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    // Check if username is already taken by another user
    if (updates.username) {
      const existingUser = await this.pool
        .request()
        .input("username", sql.VarChar, updates.username)
        .input("currentId", sql.Int, id)
        .query(
          "SELECT id FROM users WHERE username = @username AND id != @currentId",
        );

      if (existingUser.recordset.length > 0) {
        throw new Error("Username already exists");
      }
    }

    const setParts: string[] = [];
    const request = this.pool.request().input("id", sql.Int, id);

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

    // Create audit log without problematic parameters
    await this.createAuditLog({
      userId: id,
      entityType: "User",
      entityId: "system",
      action: "UPDATE",
      oldValues: "User data updated",
      newValues: "User data updated",
    });

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

  async deleteUser(id: number): Promise<void> {
    await this.pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "UPDATE users SET isActive = 0, updatedAt = GETDATE() WHERE id = @id",
      );

    // Create audit log
    await this.createAuditLog({
      userId: id,
      entityType: "User",
      entityId: "system",
      action: "DELETE",
      oldValues: "User deactivated",
      newValues: "",
    });
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

  // Stock Items management methods - Query from stock_items view with joins
  async getStockItems(): Promise<StockItem[]> {
    const result = await this.pool.request().query(`
      SELECT 
        si.id,
        si.productId,
        si.locationId,
        p.sku as assetTag,
        p.name as description,
        c.name as category,
        l.name as location,
        p.costValue,
        si.serialNumber,
        si.isActive,
        si.createdAt,
        si.updatedAt
      FROM stock_items si
      LEFT JOIN products p ON si.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id  
      LEFT JOIN locations l ON si.locationId = l.id
      WHERE si.serialNumber IS NOT NULL
      ORDER BY p.description
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

  // Enhanced Inventory Methods for Multi-Stage Process

  // Create inventory with location/category selection
  async createInventoryWithSelection(
    inventoryData: InsertInventory,
  ): Promise<Inventory> {
    const newInventory = {
      id: 0, // Will be set by SQL Server IDENTITY
      ...inventoryData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = this.pool.request();
    const result = await request
      .input("code", newInventory.code || nanoid(8))
      .input("typeId", newInventory.typeId)
      .input("status", newInventory.status || "planning")
      .input("startDate", new Date(newInventory.startDate))
      .input(
        "endDate",
        newInventory.endDate ? new Date(newInventory.endDate) : null,
      )
      .input(
        "predictedEndDate",
        newInventory.predictedEndDate
          ? new Date(newInventory.predictedEndDate)
          : null,
      )
      .input("description", newInventory.description || null)
      .input(
        "selectedLocationIds",
        inventoryData.selectedLocationIds
          ? JSON.stringify(inventoryData.selectedLocationIds)
          : null,
      )
      .input(
        "selectedCategoryIds",
        inventoryData.selectedCategoryIds
          ? JSON.stringify(inventoryData.selectedCategoryIds)
          : null,
      )
      .input("isToBlockSystem", inventoryData.isToBlockSystem || false)
      .input("createdBy", newInventory.createdBy)
      .input("createdAt", new Date(newInventory.createdAt))
      .input("updatedAt", new Date(newInventory.updatedAt)).query(`
        INSERT INTO inventories (code, typeId, status, startDate, endDate, predictedEndDate, description, selectedLocationIds, selectedCategoryIds, isToBlockSystem, createdBy, createdAt, updatedAt)
        OUTPUT INSERTED.*
        VALUES (@code, @typeId, @status, @startDate, @endDate, @predictedEndDate, @description, @selectedLocationIds, @selectedCategoryIds, @isToBlockSystem, @createdBy, @createdAt, @updatedAt)
      `);

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate
        ? new Date(inventory.endDate).getTime()
        : undefined,
      predictedEndDate: inventory.predictedEndDate
        ? new Date(inventory.predictedEndDate).getTime()
        : undefined,
      selectedLocationIds: inventory.selectedLocationIds
        ? JSON.parse(inventory.selectedLocationIds)
        : undefined,
      selectedCategoryIds: inventory.selectedCategoryIds
        ? JSON.parse(inventory.selectedCategoryIds)
        : undefined,
    };
  }

  // Transition inventory status
  async transitionInventoryStatus(
    inventoryId: number,
    newStatus: InventoryStatus,
    userId: number,
  ): Promise<void> {
    if (newStatus === "count2_closed") {
      await this.calculateFinalQuantities(inventoryId);
    }
    // If closing count3, automatically move to audit mode
    else if (newStatus === "count3_closed") {
      await this.calculateFinalQuantities(inventoryId);
      newStatus = "audit_mode";
    }

    const request = this.pool.request();

    // If transitioning to closed status, set endDate
    if (newStatus === "closed") {
      await request
        .input("id", inventoryId)
        .input("status", newStatus)
        .input("endDate", new Date())
        .input("updatedAt", new Date()).query(`
          UPDATE inventories 
          SET status = @status, endDate = @endDate, updatedAt = @updatedAt
          WHERE id = @id
        `);
    } else {
      await request
        .input("id", inventoryId)
        .input("status", newStatus)
        .input("updatedAt", new Date()).query(`
          UPDATE inventories 
          SET status = @status, updatedAt = @updatedAt
          WHERE id = @id
        `);
    }

    // Log the status transition
    await this.createAuditLog({
      userId,
      action: "INVENTORY_STATUS_CHANGE",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      newValues: JSON.stringify({ status: newStatus, endDate: newStatus === "closed" ? new Date().toISOString() : undefined }),
      metadata: JSON.stringify({ timestamp: Date.now() }),
    });
  }

  // Determine status after count2 closes based on business rules
  async determinePostCount2Status(
    inventoryId: number,
  ): Promise<InventoryStatus> {
    // First calculate final quantities
    await this.calculateFinalQuantities(inventoryId);

    // Then check if any items still need 3rd count (have null finalQuantity)
    const items = await this.getInventoryItemsByInventory(inventoryId);

    const itemsNeedingThirdCount = items.filter(
      (item) => item.finalQuantity === null || item.finalQuantity === undefined,
    );

    return itemsNeedingThirdCount.length > 0
      ? "count3_required"
      : "count2_completed";
  }

  // Calculate final quantities based on business rules
  async calculateFinalQuantities(inventoryId: number): Promise<void> {
    const items = await this.getInventoryItemsByInventory(inventoryId);

    for (const item of items) {
      const count1 = item.count1;
      const count2 = item.count2;
      const count3 = item.count3;
      const expected = item.expectedQuantity || 0;

      let finalQuantity: number | null = null;
      let itemStatus = 'PENDING'; // Default status

      // After 3rd count: finalQuantity = C3
      if (count3 !== null && count3 !== undefined) {
        finalQuantity = count3;
        itemStatus = 'COMPLETED';
      }
      // After 2nd count: apply business rules
      else if (count1 !== null && count2 !== null) {
        // If C1 == C2 == estoque → finalQuantity = estoque
        if (count1 === count2 && count1 === expected) {
          finalQuantity = expected;
          itemStatus = 'COMPLETED';
        }
        // If C1 == estoque OU C2 == estoque → finalQuantity = estoque
        else if (count1 === expected || count2 === expected) {
          finalQuantity = expected;
          itemStatus = 'COMPLETED';
        }
        // If C1 == C2 ≠ estoque → finalQuantity = C2
        else if (count1 === count2 && count1 !== expected) {
          finalQuantity = count2 ?? null;
          itemStatus = 'COMPLETED';
        }
        // If C1 ≠ C2 ≠ estoque → check special cases before requiring C3
        else if (count1 !== count2) {
          // Special case: if expected quantity is 0 OR count2 is 0, don't require C3
          if (expected === 0 || count2 === 0) {
            finalQuantity = count2;
            itemStatus = 'COMPLETED';
          } else {
            finalQuantity = null;
            itemStatus = 'NEEDS_COUNT3';
          }
        }
      }
      // After 1st count only
      else if (count1 !== null && count2 === null) {
        itemStatus = 'COUNTED_C1';
      }
      // Item not inventoried (no counts at all) - set final quantity to 0
      else if (count1 === null && count2 === null && count3 === null) {
        finalQuantity = 0;
        itemStatus = 'COMPLETED';
      }

      // Update finalQuantity and status in database
      const request = this.pool.request();
      if (finalQuantity !== null) {
        await request
          .input("id", item.id)
          .input("finalQuantity", finalQuantity)
          .input("status", itemStatus)
          .input("updatedAt", new Date()).query(`
            UPDATE inventory_items 
            SET finalQuantity = @finalQuantity, status = @status, updatedAt = @updatedAt
            WHERE id = @id
          `);
      } else {
        // Update only status when finalQuantity is null
        await request
          .input("id", item.id)
          .input("status", itemStatus)
          .input("updatedAt", new Date()).query(`
            UPDATE inventory_items 
            SET status = @status, updatedAt = @updatedAt
            WHERE id = @id
          `);
      }
    }
  }

  // Get divergent items that need 3rd count (C1 ≠ C2)
  async getDivergentInventoryItems(
    inventoryId: number,
  ): Promise<InventoryItem[]> {
    const result = await this.pool.request().input("inventoryId", inventoryId)
      .query(`
        SELECT 
          ii.*,
          p.sku,
          p.name as productName,
          p.description as productDescription,
          l.code as locationCode,
          l.name as locationName,
          c.name as categoryName
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN locations l ON ii.locationId = l.id
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE ii.inventoryId = @inventoryId
          AND ii.count1 IS NOT NULL 
          AND ii.count2 IS NOT NULL
          AND ii.count1 != ii.count2
        ORDER BY p.sku, l.code
      `);

    return result.recordset.map((item) => ({
      ...item,
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
      count1At: item.count1At ? new Date(item.count1At).getTime() : null,
      count2At: item.count2At ? new Date(item.count2At).getTime() : null,
      count3At: item.count3At ? new Date(item.count3At).getTime() : null,
      count4At: item.count4At ? new Date(item.count4At).getTime() : null,
    }));
  }

  // Get inventory statistics for Control Panel - Dynamic calculation based on inventory status
  async getInventoryStats(inventoryId: number): Promise<ControlPanelStats> {
    const request = this.pool.request();

    // First get the inventory status to determine calculation logic
    const inventoryStatusResult = await request.input("id", inventoryId).query(`
      SELECT status FROM inventories WHERE id = @id
    `);

    if (inventoryStatusResult.recordset.length === 0) {
      throw new Error("Inventory not found");
    }

    const inventoryStatus = inventoryStatusResult.recordset[0].status;

    // Get basic inventory info and counting progress
    const [inventoryResult, countsResult] = await Promise.all([
      this.pool.request().input("id", inventoryId).query(`
        SELECT COUNT(*) as activeInventories FROM inventories 
        WHERE status NOT IN ('closed', 'cancelled')
      `),
      this.pool.request().input("inventoryId", inventoryId).query(`
        SELECT 
          COUNT(CASE WHEN count1 IS NOT NULL THEN 1 END) as count1Total,
          COUNT(CASE WHEN count2 IS NOT NULL THEN 1 END) as count2Total,
          COUNT(CASE WHEN count3 IS NOT NULL THEN 1 END) as count3Total,
          COUNT(CASE WHEN count4 IS NOT NULL THEN 1 END) as auditTotal
        FROM inventory_items 
        WHERE inventoryId = @inventoryId
      `),
    ]);

    const counts = countsResult.recordset[0];

    // Dynamic calculation based on inventory status
    switch (inventoryStatus) {
      case 'count1_open': {
        const statsResult = await this.pool.request().input("inventoryId", inventoryId).query(`
          SELECT 
            COUNT(*) as totalItems,
            COUNT(CASE WHEN count1 IS NOT NULL THEN 1 END) as completedItems,
            COUNT(CASE WHEN count1 IS NOT NULL AND count1 != expectedQuantity THEN 1 END) as divergentItems,
            COUNT(CASE WHEN count1 IS NOT NULL AND count1 = expectedQuantity THEN 1 END) as accurateItems
          FROM inventory_items 
          WHERE inventoryId = @inventoryId
        `);
        
        const stats = statsResult.recordset[0];
        const totalItems = stats.totalItems || 0;
        const completedItems = stats.completedItems || 0;
        const divergentItems = stats.divergentItems || 0;
        const accurateItems = stats.accurateItems || 0;
        
        const accuracyRate = completedItems > 0 ? (accurateItems / completedItems) * 100 : 0;
        
        return {
          totalInventories: 1,
          activeInventories: inventoryResult.recordset[0].activeInventories,
          itemsInProgress: totalItems - completedItems,
          itemsCompleted: completedItems,
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          divergenceCount: divergentItems,
          totalDifference: 0, // Not applicable during count1
          accuracyItems: accurateItems,
          divergentItems: divergentItems,
          financialImpact: undefined,
          countingProgress: {
            count1: counts.count1Total,
            count2: counts.count2Total,
            count3: counts.count3Total,
            audit: counts.auditTotal,
          },
        };
      }

      case 'count2_open': {
        const statsResult = await this.pool.request().input("inventoryId", inventoryId).query(`
          SELECT 
            COUNT(*) as totalItems,
            COUNT(CASE WHEN count2 IS NOT NULL THEN 1 END) as completedItems,
            COUNT(CASE WHEN count1 IS NOT NULL AND count2 IS NOT NULL AND count1 != count2 THEN 1 END) as c1_c2_divergent,
            COUNT(CASE WHEN count2 IS NOT NULL AND count2 != expectedQuantity THEN 1 END) as c2_expected_divergent,
            COUNT(CASE WHEN count2 IS NOT NULL AND count2 = expectedQuantity THEN 1 END) as accurateItems
          FROM inventory_items 
          WHERE inventoryId = @inventoryId
        `);
        
        const stats = statsResult.recordset[0];
        const totalItems = stats.totalItems || 0;
        const completedItems = stats.completedItems || 0;
        const divergentItems = Math.max(stats.c1_c2_divergent || 0, stats.c2_expected_divergent || 0);
        const accurateItems = stats.accurateItems || 0;
        
        const accuracyRate = completedItems > 0 ? (accurateItems / completedItems) * 100 : 0;
        
        return {
          totalInventories: 1,
          activeInventories: inventoryResult.recordset[0].activeInventories,
          itemsInProgress: totalItems - completedItems,
          itemsCompleted: completedItems,
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          divergenceCount: divergentItems,
          totalDifference: 0, // Not applicable during count2
          accuracyItems: accurateItems,
          divergentItems: divergentItems,
          financialImpact: undefined,
          countingProgress: {
            count1: counts.count1Total,
            count2: counts.count2Total,
            count3: counts.count3Total,
            audit: counts.auditTotal,
          },
        };
      }

      case 'count3_open': {
        // Only items that need count3 (where C1 ≠ C2) are considered
        const statsResult = await this.pool.request().input("inventoryId", inventoryId).query(`
          SELECT 
            COUNT(CASE WHEN count1 IS NOT NULL AND count2 IS NOT NULL AND count1 != count2 THEN 1 END) as itemsNeedingCount3,
            COUNT(CASE WHEN count3 IS NOT NULL AND count1 IS NOT NULL AND count2 IS NOT NULL AND count1 != count2 THEN 1 END) as completedItems,
            COUNT(CASE WHEN count1 IS NOT NULL AND count2 IS NOT NULL AND count3 IS NOT NULL AND (count1 != count2 OR count2 != count3 OR count1 != count3) THEN 1 END) as divergentItems,
            COUNT(CASE WHEN count3 IS NOT NULL AND count3 = expectedQuantity AND count1 IS NOT NULL AND count2 IS NOT NULL AND count1 != count2 THEN 1 END) as accurateItems
          FROM inventory_items 
          WHERE inventoryId = @inventoryId
        `);
        
        const stats = statsResult.recordset[0];
        const totalItems = stats.itemsNeedingCount3 || 0;
        const completedItems = stats.completedItems || 0;
        const divergentItems = stats.divergentItems || 0;
        const accurateItems = stats.accurateItems || 0;
        
        const accuracyRate = completedItems > 0 ? (accurateItems / completedItems) * 100 : 0;
        
        return {
          totalInventories: 1,
          activeInventories: inventoryResult.recordset[0].activeInventories,
          itemsInProgress: totalItems - completedItems,
          itemsCompleted: completedItems,
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          divergenceCount: divergentItems,
          totalDifference: 0, // Not applicable during count3
          accuracyItems: accurateItems,
          divergentItems: divergentItems,
          financialImpact: undefined,
          countingProgress: {
            count1: counts.count1Total,
            count2: counts.count2Total,
            count3: counts.count3Total,
            audit: counts.auditTotal,
          },
        };
      }

      case 'audit_mode': {
        const statsResult = await this.pool.request().input("inventoryId", inventoryId).query(`
          SELECT 
            COUNT(*) as totalItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL THEN 1 END) as completedItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity != expectedQuantity THEN 1 END) as divergentItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity = expectedQuantity THEN 1 END) as accurateItems,
            SUM(CASE WHEN finalQuantity IS NOT NULL THEN (finalQuantity - expectedQuantity) ELSE 0 END) as totalDifference
          FROM inventory_items 
          WHERE inventoryId = @inventoryId
        `);
        
        const stats = statsResult.recordset[0];
        const totalItems = stats.totalItems || 0;
        const completedItems = stats.completedItems || 0;
        const divergentItems = stats.divergentItems || 0;
        const accurateItems = stats.accurateItems || 0;
        
        const accuracyRate = completedItems > 0 ? (accurateItems / completedItems) * 100 : 0;
        
        return {
          totalInventories: 1,
          activeInventories: inventoryResult.recordset[0].activeInventories,
          itemsInProgress: totalItems - completedItems,
          itemsCompleted: completedItems,
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          divergenceCount: divergentItems,
          totalDifference: stats.totalDifference || 0,
          accuracyItems: accurateItems,
          divergentItems: divergentItems,
          financialImpact: undefined,
          countingProgress: {
            count1: counts.count1Total,
            count2: counts.count2Total,
            count3: counts.count3Total,
            audit: counts.auditTotal,
          },
        };
      }

      default: {
        // For other statuses (planning, open, closed, etc.), use basic counting progress
        const statsResult = await this.pool.request().input("inventoryId", inventoryId).query(`
          SELECT 
            COUNT(*) as totalItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL THEN 1 END) as completedItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity != expectedQuantity THEN 1 END) as divergentItems,
            COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity = expectedQuantity THEN 1 END) as accurateItems,
            SUM(CASE WHEN finalQuantity IS NOT NULL THEN (finalQuantity - expectedQuantity) ELSE 0 END) as totalDifference
          FROM inventory_items 
          WHERE inventoryId = @inventoryId
        `);
        
        const stats = statsResult.recordset[0];
        const totalItems = stats.totalItems || 0;
        const completedItems = stats.completedItems || 0;
        const divergentItems = stats.divergentItems || 0;
        const accurateItems = stats.accurateItems || 0;
        
        const accuracyRate = completedItems > 0 ? (accurateItems / completedItems) * 100 : 0;
        
        return {
          totalInventories: 1,
          activeInventories: inventoryResult.recordset[0].activeInventories,
          itemsInProgress: totalItems - completedItems,
          itemsCompleted: completedItems,
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          divergenceCount: divergentItems,
          totalDifference: stats.totalDifference || 0,
          accuracyItems: accurateItems,
          divergentItems: divergentItems,
          financialImpact: undefined,
          countingProgress: {
            count1: counts.count1Total,
            count2: counts.count2Total,
            count3: counts.count3Total,
            audit: counts.auditTotal,
          },
        };
      }
    }
  }

  // Update individual count methods
  async updateCount1(
    itemId: number,
    count: number,
    countedBy: string | number,
  ): Promise<void> {
    const request = this.pool.request();
    const countedByStr =
      typeof countedBy === "number" ? countedBy.toString() : countedBy;
    await request
      .input("id", itemId)
      .input("count1", count)
      .input("count1By", countedByStr)
      .input("count1At", new Date())
      .input("updatedAt", new Date()).query(`
        UPDATE inventory_items 
        SET count1 = @count1, count1By = @count1By, count1At = @count1At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount2(
    itemId: number,
    count: number,
    countedBy: string | number,
  ): Promise<void> {
    const request = this.pool.request();
    const countedByStr =
      typeof countedBy === "number" ? countedBy.toString() : countedBy;
    await request
      .input("id", itemId)
      .input("count2", count)
      .input("count2By", countedByStr)
      .input("count2At", new Date())
      .input("updatedAt", new Date()).query(`
        UPDATE inventory_items 
        SET count2 = @count2, count2By = @count2By, count2At = @count2At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount3(
    itemId: number,
    count: number,
    countedBy: string | number,
  ): Promise<void> {
    const request = this.pool.request();
    const countedByStr =
      typeof countedBy === "number" ? countedBy.toString() : countedBy;
    await request
      .input("id", itemId)
      .input("count3", count)
      .input("count3By", countedByStr)
      .input("count3At", new Date())
      .input("updatedAt", new Date()).query(`
        UPDATE inventory_items 
        SET count3 = @count3, count3By = @count3By, count3At = @count3At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount4(
    itemId: number,
    count: number,
    countedBy: string | number,
  ): Promise<void> {
    const request = this.pool.request();
    const countedByStr =
      typeof countedBy === "number" ? countedBy.toString() : countedBy;
    await request
      .input("id", itemId)
      .input("count4", count)
      .input("count4By", countedByStr)
      .input("count4At", new Date())
      .input("finalQuantity", count) // Automatically update finalQuantity when count4 is set
      .input("updatedAt", new Date()).query(`
        UPDATE inventory_items 
        SET count4 = @count4, count4By = @count4By, count4At = @count4At, 
            finalQuantity = @finalQuantity, updatedAt = @updatedAt, 
            status = 'confirmed'
        WHERE id = @id
      `);
  }

  async updateInventoryItemStatus(
    itemId: number,
    status: string,
  ): Promise<void> {
    const request = this.pool.request();
    await request.input("id", itemId).input("status", status).query(`
        UPDATE inventory_items 
        SET status = @status
        WHERE id = @id
      `);
  }

  async registerManualCount(data: {
    inventoryId: number;
    productId: number;
    locationId: number;
    quantity: number;
    countStage: string;
    userId: number;
  }): Promise<any> {
    const { inventoryId, productId, locationId, quantity, countStage, userId } = data;
    
    // First, check if inventory item exists
    const checkRequest = this.pool.request();
    const existingItem = await checkRequest
      .input("inventoryId", inventoryId)
      .input("productId", productId)
      .input("locationId", locationId)
      .query(`
        SELECT id FROM inventory_items 
        WHERE inventoryId = @inventoryId 
        AND productId = @productId 
        AND locationId = @locationId
      `);

    let itemId: number;
    
    if (existingItem.recordset.length === 0) {
      // Create new inventory item if it doesn't exist
      const createRequest = this.pool.request();
      const newItem = await createRequest
        .input("inventoryId", inventoryId)
        .input("productId", productId)
        .input("locationId", locationId)
        .input("stockQuantity", 0)
        .input("status", "pending")
        .input("createdAt", new Date())
        .input("updatedAt", new Date())
        .query(`
          INSERT INTO inventory_items (inventoryId, productId, locationId, stockQuantity, status, createdAt, updatedAt)
          OUTPUT INSERTED.id
          VALUES (@inventoryId, @productId, @locationId, @stockQuantity, @status, @createdAt, @updatedAt)
        `);
      
      itemId = newItem.recordset[0].id;
    } else {
      itemId = existingItem.recordset[0].id;
    }

    // Update the appropriate count based on countStage
    const updateRequest = this.pool.request();
    const countedByStr = userId.toString();
    const now = new Date();
    
    let updateQuery = "";
    
    switch (countStage) {
      case "1":
      case "count1":
        updateQuery = `
          UPDATE inventory_items 
          SET count1 = @quantity, count1By = @countedBy, count1At = @countedAt, updatedAt = @updatedAt
          WHERE id = @itemId
        `;
        break;
      case "2":
      case "count2":
        updateQuery = `
          UPDATE inventory_items 
          SET count2 = @quantity, count2By = @countedBy, count2At = @countedAt, updatedAt = @updatedAt
          WHERE id = @itemId
        `;
        break;
      case "3":
      case "count3":
        updateQuery = `
          UPDATE inventory_items 
          SET count3 = @quantity, count3By = @countedBy, count3At = @countedAt, updatedAt = @updatedAt
          WHERE id = @itemId
        `;
        break;
      case "4":
      case "count4":
        updateQuery = `
          UPDATE inventory_items 
          SET count4 = @quantity, count4By = @countedBy, count4At = @countedAt, 
              finalQuantity = @quantity, status = 'confirmed', updatedAt = @updatedAt
          WHERE id = @itemId
        `;
        break;
      default:
        throw new Error(`Invalid count stage: ${countStage}`);
    }

    await updateRequest
      .input("itemId", itemId)
      .input("quantity", quantity)
      .input("countedBy", countedByStr)
      .input("countedAt", now)
      .input("updatedAt", now)
      .query(updateQuery);

    return {
      success: true,
      itemId,
      message: "Manual count registered successfully"
    };
  }

  // Generate comprehensive final report for inventory
  async getInventoryFinalReport(
    inventoryId: number,
  ): Promise<InventoryFinalReport> {
    const request = this.pool.request();

    // Get inventory basic info
    const inventoryResult = await request.input("inventoryId", inventoryId)
      .query(`
        SELECT i.*, it.description as typeName
        FROM inventories i
        LEFT JOIN inventory_types it ON i.typeId = it.id
        WHERE i.id = @inventoryId
      `);

    if (inventoryResult.recordset.length === 0) {
      throw new Error("Inventory not found");
    }

    const inventory = inventoryResult.recordset[0];

    // Get participants from inventory_items count fields
    const participantsResult = await request.input("inventoryIdParticipants", inventoryId).query(`
      SELECT DISTINCT 
        u.id as userId,
        u.username as userName,
        SUM(CASE WHEN ii.count1By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) as count1Items,
        SUM(CASE WHEN ii.count2By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) as count2Items,
        SUM(CASE WHEN ii.count3By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) as count3Items,
        SUM(CASE WHEN ii.count4By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) as count4Items,
        (SUM(CASE WHEN ii.count1By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
         SUM(CASE WHEN ii.count2By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
         SUM(CASE WHEN ii.count3By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
         SUM(CASE WHEN ii.count4By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END)) as itemsCounted
      FROM users u
      INNER JOIN inventory_items ii ON (
        ii.count1By = CAST(u.id AS VARCHAR) OR 
        ii.count2By = CAST(u.id AS VARCHAR) OR 
        ii.count3By = CAST(u.id AS VARCHAR) OR 
        ii.count4By = CAST(u.id AS VARCHAR)
      )
      WHERE ii.inventoryId = @inventoryIdParticipants
      GROUP BY u.id, u.username
      HAVING (SUM(CASE WHEN ii.count1By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
              SUM(CASE WHEN ii.count2By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
              SUM(CASE WHEN ii.count3By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END) +
              SUM(CASE WHEN ii.count4By = CAST(u.id AS VARCHAR) THEN 1 ELSE 0 END)) > 0
    `);

    // Get comprehensive statistics
    const [itemsResult, divergentItemsResult, financialResult] =
      await Promise.all([
        request.input("inventoryId1", inventoryId).query(`
        SELECT 
          COUNT(*) as totalItems,
          COUNT(CASE WHEN finalQuantity IS NOT NULL THEN 1 END) as completedItems,
          COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity = expectedQuantity THEN 1 END) as accurateItems,
          COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity != expectedQuantity THEN 1 END) as divergentItems,
          COUNT(CASE WHEN count1 IS NOT NULL THEN 1 END) as count1Items,
          COUNT(CASE WHEN count2 IS NOT NULL THEN 1 END) as count2Items,
          COUNT(CASE WHEN count3 IS NOT NULL THEN 1 END) as count3Items,
          COUNT(CASE WHEN count4 IS NOT NULL THEN 1 END) as auditItems,
          SUM(CASE WHEN finalQuantity IS NOT NULL THEN (finalQuantity - expectedQuantity) ELSE 0 END) as totalDifference,
          SUM(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity > expectedQuantity THEN (finalQuantity - expectedQuantity) ELSE 0 END) as positiveAdjustments,
          SUM(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity < expectedQuantity THEN ABS(finalQuantity - expectedQuantity) ELSE 0 END) as negativeAdjustments,
          COUNT(CASE WHEN finalQuantity IS NOT NULL AND finalQuantity != expectedQuantity THEN 1 END) as adjustmentCount
        FROM inventory_items 
        WHERE inventoryId = @inventoryId1
      `),
        request.input("inventoryId2", inventoryId).query(`
        SELECT 
          ii.id,
          p.name as productName,
          p.sku as productSku,
          l.name as locationName,
          ii.expectedQuantity,
          ii.finalQuantity,
          (ii.finalQuantity - ii.expectedQuantity) as difference,
          CAST(ISNULL(p.costValue, 0) as DECIMAL(10,2)) as costValue
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN locations l ON ii.locationId = l.id
        WHERE ii.inventoryId = @inventoryId2 
          AND ii.finalQuantity IS NOT NULL 
          AND ii.finalQuantity != ii.expectedQuantity
        ORDER BY ABS(ii.finalQuantity - ii.expectedQuantity) DESC
      `),
        request.input("inventoryId3", inventoryId).query(`
        SELECT 
          SUM(ii.expectedQuantity * ISNULL(p.costValue, 0)) as totalValue,
          SUM((ii.finalQuantity - ii.expectedQuantity) * ISNULL(p.costValue, 0)) as differenceValue
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        WHERE ii.inventoryId = @inventoryId3 AND ii.finalQuantity IS NOT NULL
      `),
      ]);

    const stats = itemsResult.recordset[0];
    const divergentItems = divergentItemsResult.recordset;
    const financial = financialResult.recordset[0];
    const participants = participantsResult.recordset;

    const accuracyRate =
      stats.completedItems > 0
        ? (stats.accurateItems / stats.completedItems) * 100
        : 0;
    const totalValue = financial.totalValue || 0;
    const differenceValue = financial.differenceValue || 0;
    const impactPercentage =
      totalValue > 0 ? Math.abs(differenceValue / totalValue) * 100 : 0;

    // Calculate time spent (in hours)
    const totalTimeSpent = inventory.endDate && inventory.startDate
      ? Math.round((new Date(inventory.endDate).getTime() - new Date(inventory.startDate).getTime()) / (1000 * 60 * 60))
      : 0;

    // Generate recommendations based on results
    const recommendations: string[] = [];

    if (accuracyRate < 95) {
      recommendations.push(
        "Taxa de acurácia abaixo de 95%. Considere revisar processos de contagem.",
      );
    }

    if (stats.divergentItems > stats.totalItems * 0.1) {
      recommendations.push(
        "Mais de 10% dos itens apresentam divergências. Recomenda-se auditoria adicional.",
      );
    }

    if (Math.abs(differenceValue) > totalValue * 0.05) {
      recommendations.push(
        "Impacto financeiro superior a 5%. Necessária aprovação gerencial para ajustes.",
      );
    }

    if (stats.auditItems > 0) {
      recommendations.push(
        `${stats.auditItems} itens passaram por auditoria manual (C4). Documentar justificativas.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Inventário concluído com excelentes resultados. Nenhuma ação adicional necessária.",
      );
    }

    return {
      inventoryId: inventory.id,
      inventoryCode: inventory.code,
      inventoryName: inventory.description || `${inventory.typeName} - ${new Date(inventory.startDate).toLocaleDateString()}`,
      status: inventory.status,
      startDate: inventory.startDate,
      endDate: inventory.endDate || undefined,
      totalTimeSpent: totalTimeSpent,
      type: {
        id: inventory.typeId,
        name: inventory.typeName || 'Tipo não definido'
      },
      createdBy: {
        id: inventory.createdBy,
        name: 'Admin' // Simplified for now
      },
      description: inventory.description,
      selectedLocations: inventory.selectedLocationIds 
        ? await this.getLocationsByIds(JSON.parse(inventory.selectedLocationIds))
        : [],
      selectedCategories: inventory.selectedCategoryIds 
        ? await this.getCategoriesByIds(JSON.parse(inventory.selectedCategoryIds))
        : [],
      kpis: {
        totalStock: totalValue,
        accuracyRate: Math.round(accuracyRate * 10) / 10,
        totalLossValue: Math.abs(differenceValue)
      },
      participants: participants.map((p: any) => ({
        userId: p.userId,
        userName: p.userName || `Usuário ${p.userId}`,
        itemsCounted: p.itemsCounted || 0,
        count1Items: p.count1Items || 0,
        count2Items: p.count2Items || 0,
        count3Items: p.count3Items || 0,
        count4Items: p.count4Items || 0
      })),
      totalItems: stats.totalItems,
      completedItems: stats.completedItems,
      accuracy: {
        totalItems: stats.totalItems,
        accurateItems: stats.accurateItems,
        divergentItems: stats.divergentItems,
        accuracyRate: Math.round(accuracyRate * 10) / 10,
      },
      differences: {
        totalDifference: Math.abs(stats.totalDifference || 0),
        positiveAdjustments: stats.positiveAdjustments || 0,
        negativeAdjustments: stats.negativeAdjustments || 0,
        adjustmentCount: stats.adjustmentCount || 0,
      },
      financial: {
        totalValue: totalValue,
        differenceValue: differenceValue,
        impactPercentage: Math.round(impactPercentage * 100) / 100,
      },
      inventoryValues: {
        expectedValue: totalValue,
        finalValue: totalValue + differenceValue,
        lossValue: Math.abs(differenceValue)
      },
      countingSummary: {
        count1Items: stats.count1Items,
        count2Items: stats.count2Items,
        count3Items: stats.count3Items,
        count4Items: stats.auditItems, // Corrigido: usar auditItems para count4Items
        auditItems: stats.auditItems,
      },
      divergentItems: divergentItems.map((item: any) => {
        const costValue = parseFloat(item.costValue) || 0;
        const difference = item.difference || 0;
        const totalImpact = costValue > 0 ? difference * costValue : 0;
        
        // Divergent item processed
        
        return {
          id: item.id,
          productName: item.productName,
          productSku: item.productSku,
          locationName: item.locationName,
          expectedQuantity: item.expectedQuantity,
          finalQuantity: item.finalQuantity,
          difference: difference,
          costValue: costValue,
          totalImpact: totalImpact,
        };
      }),
      recommendations,
    };
  }

  // Export inventory items to Excel format data
  async getInventoryExportData(inventoryId: number): Promise<any[]> {
    const request = this.pool.request();
    
    const result = await request.input("inventoryId", inventoryId).query(`
      SELECT 
        p.sku as SKU,
        p.name as Descrição,
        ii.expectedQuantity as "Quantidade Esperada",
        ii.count1 as "Contagem 1",
        ii.count2 as "Contagem 2", 
        ii.count3 as "Contagem 3",
        ii.count4 as "Contagem 4",
        ii.finalQuantity as "Quantidade Final"
      FROM inventory_items ii
      LEFT JOIN products p ON ii.productId = p.id
      WHERE ii.inventoryId = @inventoryId
      ORDER BY p.sku
    `);

    return result.recordset;
  }

  // Inventory Stock Items methods (for patrimônio)
  async createInventoryStockItem(
    data: InsertInventoryStockItem,
  ): Promise<InventoryStockItem> {
    const newItem = {
      id: 0,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = this.pool.request();
    const result = await request
      .input("inventoryId", newItem.inventoryId)
      .input("stockItemId", newItem.stockItemId)
      .input("expectedQuantity", newItem.expectedQuantity || 0)
      .input("status", newItem.status || "PENDING")
      .input("createdAt", new Date(newItem.createdAt))
      .input("updatedAt", new Date(newItem.updatedAt)).query(`
        INSERT INTO inventory_stock_items (inventoryId, stockItemId, expectedQuantity, status, createdAt, updatedAt)
        OUTPUT INSERTED.*
        VALUES (@inventoryId, @stockItemId, @expectedQuantity, @status, @createdAt, @updatedAt)
      `);

    const stockItem = result.recordset[0];
    return {
      ...stockItem,
      createdAt: new Date(stockItem.createdAt).getTime(),
      updatedAt: new Date(stockItem.updatedAt).getTime(),
    };
  }

  async getInventoryStockItems(
    inventoryId: number,
  ): Promise<InventoryStockItem[]> {
    const result = await this.pool.request().input("inventoryId", inventoryId)
      .query(`
        SELECT * FROM inventory_stock_items 
        WHERE inventoryId = @inventoryId 
        ORDER BY id
      `);

    return result.recordset.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      updatedAt: new Date(item.updatedAt).getTime(),
      count1At: item.count1At ? new Date(item.count1At).getTime() : undefined,
      count2At: item.count2At ? new Date(item.count2At).getTime() : undefined,
      count3At: item.count3At ? new Date(item.count3At).getTime() : undefined,
      count4At: item.count4At ? new Date(item.count4At).getTime() : undefined,
    }));
  }

  async updateInventoryStockItemCount(
    itemId: number,
    countData: {
      count: number;
      countBy: string;
      countType: "count1" | "count2" | "count3" | "count4";
    },
  ): Promise<void> {
    const { count, countBy, countType } = countData;
    const countByField = `${countType}By`;
    const countAtField = `${countType}At`;

    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count", count)
      .input("countBy", countBy)
      .input("countAt", new Date())
      .input("updatedAt", new Date()).query(`
        UPDATE inventory_stock_items 
        SET ${countType} = @count, ${countByField} = @countBy, ${countAtField} = @countAt, updatedAt = @updatedAt
        WHERE id = @id
      `);

    // Calculate and update difference for stock item
    await this.calculateStockItemDifference(itemId);
  }

  private async calculateStockItemDifference(itemId: number): Promise<void> {
    // This method is kept for compatibility but doesn't update difference/accuracy columns
    // since they don't exist in the current database schema
    return;
  }

  // Create inventory item
  async createInventoryItem(
    itemData: InsertInventoryItem,
  ): Promise<InventoryItem> {
    const request = this.pool.request();
    
    // Campos básicos obrigatórios
    request
      .input("inventoryId", itemData.inventoryId)
      .input("productId", itemData.productId)
      .input("locationId", itemData.locationId)
      .input("expectedQuantity", itemData.expectedQuantity)
      .input("status", itemData.status || "pending")
      .input("createdAt", new Date())
      .input("updatedAt", new Date());

    // Construir campos dinâmicos para contagem
    const dynamicFields: string[] = [];
    const dynamicValues: string[] = [];
    
    Object.keys(itemData).forEach(key => {
      // Incluir campos de contagem (count1, count1By, count1At, etc.)
      if (key.startsWith('count') && !['inventoryId', 'productId', 'locationId', 'expectedQuantity', 'status', 'createdAt', 'updatedAt'].includes(key)) {
        const value = (itemData as any)[key];
        if (value !== undefined && value !== null) {
          dynamicFields.push(key);
          dynamicValues.push(`@${key}`);
          
          // Adicionar como parâmetro
          if (key.endsWith('At')) {
            // Campos de timestamp
            request.input(key, new Date(value));
          } else {
            request.input(key, value);
          }
        }
      }
    });

    // Construir query dinâmica
    const baseFields = "inventoryId, productId, locationId, expectedQuantity, status, createdAt, updatedAt";
    const baseValues = "@inventoryId, @productId, @locationId, @expectedQuantity, @status, @createdAt, @updatedAt";
    
    const allFields = dynamicFields.length > 0 ? `${baseFields}, ${dynamicFields.join(', ')}` : baseFields;
    const allValues = dynamicValues.length > 0 ? `${baseValues}, ${dynamicValues.join(', ')}` : baseValues;

    const query = `
      INSERT INTO inventory_items (${allFields})
      OUTPUT INSERTED.*
      VALUES (${allValues})
    `;



    const result = await request.query(query);

    const item = result.recordset[0];
    return {
      ...item,
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
    };
  }

  // Get inventory items
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

  // Get inventory items by inventory ID
  async getInventoryItemsByInventory(
    inventoryId: number,
  ): Promise<InventoryItem[]> {
    const result = await this.pool
      .request()
      .input("inventoryId", inventoryId)
      .query(
        "SELECT * FROM inventory_items WHERE inventoryId = @inventoryId ORDER BY id",
      );

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

  async getAllCountsForInventory(inventoryId: number): Promise<(Count & { countedByUser: User })[]> {
    // Get all inventory items for this inventory
    const items = await this.getInventoryItemsByInventory(inventoryId);
    const itemIds = items.map(item => item.id);
    
    if (itemIds.length === 0) {
      return [];
    }
    
    // Get all counts for these inventory items
    const result = await this.pool.request()
      .input('itemIds', sql.VarChar, itemIds.join(','))
      .query(`
        SELECT c.*, u.id as userId, u.username, u.firstName, u.lastName, u.email, u.role
        FROM counts c
        JOIN users u ON c.countedBy = u.id
        WHERE c.inventoryItemId IN (SELECT value FROM STRING_SPLIT(@itemIds, ','))
        ORDER BY c.countedAt
      `);
    
    return result.recordset.map(count => ({
      ...count,
      countedAt: count.countedAt ? new Date(count.countedAt).getTime() : Date.now(),
      countedByUser: {
        id: count.userId,
        username: count.username,
        firstName: count.firstName,
        lastName: count.lastName,
        email: count.email,
        role: count.role,
        password: '', // Don't expose password
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }));
  }

  async getInventoryItemsWithDetails(
    inventoryId: number,
  ): Promise<(InventoryItem & { product: Product; location: Location })[]> {
    const result = await this.pool.request().input("inventoryId", inventoryId)
      .query(`
        SELECT 
          ii.*,
          p.sku,
          p.name as productName,
          p.description as productDescription,
          p.categoryId,
          COALESCE(c.name, 'Sem categoria') as categoryName,
          l.code as locationCode,
          l.name as locationName
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        LEFT JOIN locations l ON ii.locationId = l.id
        WHERE ii.inventoryId = @inventoryId
        ORDER BY 
          CASE WHEN c.name IS NULL THEN 1 ELSE 0 END,
          COALESCE(c.name, 'Sem categoria'), 
          p.name, 
          l.code
      `);

    return result.recordset.map((item) => ({
      ...item,
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Date.now(),
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : Date.now(),
      count1At: item.count1At ? new Date(item.count1At).getTime() : undefined,
      count2At: item.count2At ? new Date(item.count2At).getTime() : undefined,
      count3At: item.count3At ? new Date(item.count3At).getTime() : undefined,
      count4At: item.count4At ? new Date(item.count4At).getTime() : undefined,
      product: {
        id: item.productId,
        sku: item.sku || "N/A",
        name: item.productName || "Produto não encontrado",
        description: item.productDescription || "Sem descrição",
        categoryId: item.categoryId || null,
        categoryName: item.categoryName || "Sem categoria",
        costValue: 0,
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      location: {
        id: item.locationId,
        code: item.locationCode || "N/A",
        name: item.locationName || "Local não encontrado",
        description: "",
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }));
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    totalLocations: number;
    totalInventories: number;
  }> {
    try {
      const [
        productsResult,
        categoriesResult,
        locationsResult,
        inventoriesResult,
      ] = await Promise.all([
        this.pool.request().query("SELECT COUNT(*) as count FROM products"),
        this.pool.request().query("SELECT COUNT(*) as count FROM categories"),
        this.pool.request().query("SELECT COUNT(*) as count FROM locations"),
        this.pool.request().query("SELECT COUNT(*) as count FROM inventories"),
      ]);

      return {
        totalProducts: productsResult.recordset[0].count,
        totalCategories: categoriesResult.recordset[0].count,
        totalLocations: locationsResult.recordset[0].count,
        totalInventories: inventoriesResult.recordset[0].count,
      };
    } catch (error) {
      // Error getting dashboard stats
      throw error;
    }
  }

  async deleteInventory(id: number): Promise<void> {
    // Delete related records first (counts must be deleted before inventory_items)
    await this.pool
      .request()
      .input("inventoryId1", id)
      .query(
        "DELETE FROM counts WHERE inventoryItemId IN (SELECT id FROM inventory_items WHERE inventoryId = @inventoryId1)",
      );

    // Delete inventory items
    await this.pool
      .request()
      .input("inventoryId2", id)
      .query("DELETE FROM inventory_items WHERE inventoryId = @inventoryId2");

    // Finally delete the inventory itself
    await this.pool
      .request()
      .input("inventoryId3", id)
      .query("DELETE FROM inventories WHERE id = @inventoryId3");
  }

  // ===== CONTROLE DE PATRIMÔNIO POR NÚMERO DE SÉRIE =====

  // Criar itens de série para inventário
  async createInventorySerialItems(inventoryId: number): Promise<void> {
    // Creating serial items for inventory

    try {
      // First, remove any existing duplicates for this inventory
      await this.removeDuplicateSerialItems(inventoryId);

      // Create serial items with location filtering
      await this.pool.request().input("inventoryId", sql.Int, inventoryId)
        .query(`
          INSERT INTO inventory_serial_items (
            inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
          )
          SELECT 
            @inventoryId,
            si.id,
            si.serialNumber,
            si.productId,
            si.locationId,
            1
          FROM stock_items si
          INNER JOIN inventory_items ii ON si.productId = ii.productId AND si.locationId = ii.locationId
          WHERE ii.inventoryId = @inventoryId
          AND NOT EXISTS (
            SELECT 1 FROM inventory_serial_items isi 
            WHERE isi.inventoryId = @inventoryId 
            AND isi.serialNumber = si.serialNumber
            AND isi.productId = si.productId
            AND isi.locationId = si.locationId
          );

          -- Update counters in inventory_items
          UPDATE ii
          SET serialItemsCount = (
            SELECT COUNT(*)
            FROM inventory_serial_items isi
            WHERE isi.inventoryId = ii.inventoryId
            AND isi.productId = ii.productId
            AND isi.locationId = ii.locationId
          )
          FROM inventory_items ii
          WHERE ii.inventoryId = @inventoryId;
        `);

    } catch (error) {
      // Error creating inventory serial items
      throw error;
    }
  }

  // Remove duplicate serial items for an inventory
  async removeDuplicateSerialItems(inventoryId: number): Promise<void> {
    // Removing duplicate serial items for inventory
    
    try {
      await this.pool.request().input("inventoryId", sql.Int, inventoryId)
        .query(`
          WITH DuplicateSerials AS (
            SELECT 
              id,
              ROW_NUMBER() OVER (
                PARTITION BY inventoryId, serialNumber, productId, locationId 
                ORDER BY id
              ) as rn
            FROM inventory_serial_items
            WHERE inventoryId = @inventoryId
          )
          DELETE FROM inventory_serial_items
          WHERE id IN (
            SELECT id FROM DuplicateSerials WHERE rn > 1
          );
        `);
      
      // Duplicate serial items removed for inventory
    } catch (error) {
      // Error removing duplicate serial items
      throw error;
    }
  }

  // Buscar todos os itens de série de um inventário
  async getInventorySerialItems(
    inventoryId: number,
  ): Promise<InventorySerialItem[]> {
    const result = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId).query(`
        SELECT 
          isi.id, isi.inventoryId, isi.stockItemId, isi.serialNumber, isi.productId, isi.locationId, isi.expectedStatus,
          isi.count1_found, isi.count2_found, isi.count3_found, isi.count4_found,
          isi.count1_by, isi.count2_by, isi.count3_by, isi.count4_by,
          isi.count1_at, isi.count2_at, isi.count3_at, isi.count4_at,
          isi.status, isi.notes, isi.finalStatus, isi.createdAt, isi.updatedAt
        FROM inventory_serial_items isi
        INNER JOIN inventory_items ii ON isi.inventoryId = ii.inventoryId 
          AND isi.productId = ii.productId 
          AND isi.locationId = ii.locationId
        WHERE isi.inventoryId = @inventoryId
        ORDER BY isi.serialNumber
      `);

    return result.recordset.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      count1_at: row.count1_at ? new Date(row.count1_at).getTime() : undefined,
      count2_at: row.count2_at ? new Date(row.count2_at).getTime() : undefined,
      count3_at: row.count3_at ? new Date(row.count3_at).getTime() : undefined,
      count4_at: row.count4_at ? new Date(row.count4_at).getTime() : undefined,
    }));
  }

  async correctInventorySerials(inventoryId: number, userId: number): Promise<{ insertedCount: number; existingCount: number; details: { stockItemId: number; serialNumber: string; productId: number; locationId: number; }[]; timestamp: number; }> {
    const transaction = this.pool.transaction();
    await transaction.begin();
    try {
      const invRes = await transaction.request().input("inventoryId", sql.Int, inventoryId).query(`
        SELECT id, status FROM inventories WHERE id = @inventoryId
      `);
      if (invRes.recordset.length === 0) {
        throw new Error("Inventário não encontrado");
      }
      const status = invRes.recordset[0].status;
      if (status !== "open") {
        throw new Error("Correção permitida apenas para inventários abertos");
      }

      const countsStartedRes = await transaction.request().input("inventoryId", sql.Int, inventoryId).query(`
        SELECT COUNT(1) as cnt
        FROM counts c
        WHERE c.inventoryItemId IN (
          SELECT id FROM inventory_items WHERE inventoryId = @inventoryId
        )
      `);
      const countsStarted = countsStartedRes.recordset[0]?.cnt || 0;
      if (countsStarted > 0) {
        throw new Error("Inventário com contagem iniciada não pode ser corrigido");
      }

      const missingRes = await transaction.request().input("inventoryId", sql.Int, inventoryId).query(`
        SELECT 
          si.id as stockItemId,
          si.serialNumber,
          si.productId,
          si.locationId
        FROM stock_items si
        INNER JOIN inventory_items ii ON si.productId = ii.productId AND si.locationId = ii.locationId
        WHERE ii.inventoryId = @inventoryId
        AND NOT EXISTS (
          SELECT 1 FROM inventory_serial_items isi 
          WHERE isi.inventoryId = @inventoryId 
          AND isi.serialNumber = si.serialNumber
          AND isi.productId = si.productId
          AND isi.locationId = si.locationId
        )
      `);

      const existingRes = await transaction.request().input("inventoryId", sql.Int, inventoryId).query(`
        SELECT COUNT(*) as cnt
        FROM stock_items si
        INNER JOIN inventory_items ii ON si.productId = ii.productId AND si.locationId = ii.locationId
        WHERE ii.inventoryId = @inventoryId
        AND EXISTS (
          SELECT 1 FROM inventory_serial_items isi 
          WHERE isi.inventoryId = @inventoryId 
          AND isi.serialNumber = si.serialNumber
          AND isi.productId = si.productId
          AND isi.locationId = si.locationId
        )
      `);

      const details = missingRes.recordset.map((r: any) => ({
        stockItemId: r.stockItemId,
        serialNumber: r.serialNumber,
        productId: r.productId,
        locationId: r.locationId,
      }));

      if (details.length > 0) {
        await transaction.request().input("inventoryId", sql.Int, inventoryId).query(`
          INSERT INTO inventory_serial_items (
            inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
          )
          SELECT 
            @inventoryId,
            si.id,
            si.serialNumber,
            si.productId,
            si.locationId,
            1
          FROM stock_items si
          INNER JOIN inventory_items ii ON si.productId = ii.productId AND si.locationId = ii.locationId
          WHERE ii.inventoryId = @inventoryId
          AND NOT EXISTS (
            SELECT 1 FROM inventory_serial_items isi 
            WHERE isi.inventoryId = @inventoryId 
            AND isi.serialNumber = si.serialNumber
            AND isi.productId = si.productId
            AND isi.locationId = si.locationId
          );

          UPDATE ii
          SET serialItemsCount = (
            SELECT COUNT(*)
            FROM inventory_serial_items isi
            WHERE isi.inventoryId = ii.inventoryId
            AND isi.productId = ii.productId
            AND isi.locationId = ii.locationId
          )
          FROM inventory_items ii
          WHERE ii.inventoryId = @inventoryId;
        `);
      }

      await transaction.request()
        .input("userId", sql.Int, userId)
        .input("action", sql.NVarChar, "CORRECT_SERIAL_ITEMS")
        .input("entityType", sql.NVarChar, "inventory")
        .input("entityId", sql.NVarChar, inventoryId.toString())
        .input("metadata", sql.NVarChar, JSON.stringify({ insertedCount: details.length }))
        .input("timestamp", sql.DateTime, new Date())
        .query(`
          INSERT INTO audit_logs (userId, action, entityType, entityId, metadata, timestamp)
          VALUES (@userId, @action, @entityType, @entityId, @metadata, @timestamp)
        `);

      await transaction.commit();

      return {
        insertedCount: details.length,
        existingCount: existingRes.recordset[0]?.cnt || 0,
        details,
        timestamp: Date.now(),
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Buscar itens de série por usuário
  async getInventorySerialItemsByUser(
    inventoryId: number,
    userId: number,
    productId?: number,
  ): Promise<InventorySerialItem[]> {
    const request = this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("userId", sql.Int, userId);

    let whereClause = `WHERE inventoryId = @inventoryId 
        AND (
          (count1_found = 1 AND count1_by = @userId) OR
          (count2_found = 1 AND count2_by = @userId) OR
          (count3_found = 1 AND count3_by = @userId) OR
          (count4_found = 1 AND count4_by = @userId)
        )`;

    if (productId) {
      request.input("productId", sql.Int, productId);
      whereClause += ` AND productId = @productId`;
    }

    const result = await request.query(`
        SELECT 
          id, inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus,
          count1_found, count2_found, count3_found, count4_found,
          count1_by, count2_by, count3_by, count4_by,
          count1_at, count2_at, count3_at, count4_at,
          status, notes, finalStatus, createdAt, updatedAt
        FROM inventory_serial_items 
        ${whereClause}
        ORDER BY serialNumber
      `);

    return result.recordset.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      count1_at: row.count1_at ? new Date(row.count1_at).getTime() : undefined,
      count2_at: row.count2_at ? new Date(row.count2_at).getTime() : undefined,
      count3_at: row.count3_at ? new Date(row.count3_at).getTime() : undefined,
      count4_at: row.count4_at ? new Date(row.count4_at).getTime() : undefined,
    }));
  }

  // Buscar itens de série por produto
  async getInventorySerialItemsByProduct(
    inventoryId: number,
    productId: number,
  ): Promise<InventorySerialItem[]> {
    const result = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("productId", sql.Int, productId).query(`
        SELECT 
          id, inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus,
          count1_found, count2_found, count3_found, count4_found,
          count1_by, count2_by, count3_by, count4_by,
          count1_at, count2_at, count3_at, count4_at,
          status, notes, finalStatus, createdAt, updatedAt
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId AND productId = @productId
        ORDER BY serialNumber
      `);

    return result.recordset.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      count1_at: row.count1_at ? new Date(row.count1_at).getTime() : undefined,
      count2_at: row.count2_at ? new Date(row.count2_at).getTime() : undefined,
      count3_at: row.count3_at ? new Date(row.count3_at).getTime() : undefined,
      count4_at: row.count4_at ? new Date(row.count4_at).getTime() : undefined,
    }));
  }

  // Verificar informações de número de série sem registrar leitura
  async getSerialInfo(
    inventoryId: number,
    request: SerialReadingRequest,
    userId: Number,
  ): Promise<SerialReadingResponse> {
    // Verificar se série existe
    const product = await this.findProductBySerial(request.serialNumber);
    if (!product) {
      return {
        success: false,
        newSerial: true,
        message: "Número de série não encontrado no sistema",
      };
    }

    // Verificar se já foi lida neste estágio
    const existingReading = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("serialNumber", sql.NVarChar, request.serialNumber).query(`
        SELECT * FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId 
        AND serialNumber = @serialNumber
        AND ${request.countStage}_found = 1
      `);

    if (existingReading.recordset.length > 0) {
      return {
        success: false,
        alreadyRead: true,
        productId: product.id,
        productName: product.name,
        message: "Número de série já foi lido neste estágio",
      };
    }

    // Obter informações do produto para identificar o local
    const serialItemInfo = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("serialNumber", sql.NVarChar, request.serialNumber).query(`
        SELECT isi.productId, isi.locationId, l.name as locationName
        FROM inventory_serial_items isi
        LEFT JOIN locations l ON isi.locationId = l.id
        WHERE isi.inventoryId = @inventoryId 
        AND isi.serialNumber = @serialNumber
      `);

    let locationId: number | undefined;
    let locationName: string | undefined;
    if (serialItemInfo.recordset.length > 0) {
      locationId = serialItemInfo.recordset[0].locationId;
      locationName = serialItemInfo.recordset[0].locationName;
    }

    // Retornar informações sem registrar a leitura
    return {
      success: true,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      locationId: locationId,
      locationName: locationName,
      message: "Informações da série obtidas com sucesso",
    };
  }

  // Registrar leitura de número de série
  async registerSerialReading(
    inventoryId: number,
    request: SerialReadingRequest,
    userId: Number,
  ): Promise<SerialReadingResponse> {
    // Verificar se série existe
    const product = await this.findProductBySerial(request.serialNumber);
    if (!product) {
      return {
        success: false,
        newSerial: true,
        message: "Número de série não encontrado no sistema",
      };
    }

    // Verificar se já foi lida neste estágio
    const existingReading = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("serialNumber", sql.NVarChar, request.serialNumber).query(`
        SELECT * FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId 
        AND serialNumber = @serialNumber
        AND ${request.countStage}_found = 1
      `);

    if (existingReading.recordset.length > 0) {
      return {
        success: false,
        alreadyRead: true,
        productId: product.id,
        productName: product.name,
        message: "Número de série já foi lido neste estágio",
      };
    }

    // Obter informações do produto para identificar o local
    const serialItemInfo = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("serialNumber", sql.NVarChar, request.serialNumber).query(`
        SELECT isi.productId, isi.locationId, l.name as locationName
        FROM inventory_serial_items isi
        LEFT JOIN locations l ON isi.locationId = l.id
        WHERE isi.inventoryId = @inventoryId 
        AND isi.serialNumber = @serialNumber
      `);

      let locationId: number | undefined;
      let locationName: string | undefined;
    if (serialItemInfo.recordset.length > 0) {
      locationId = serialItemInfo.recordset[0].locationId;
      locationName = serialItemInfo.recordset[0].locationName;
    }

    // Registrar leitura usando stored procedure
    await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .input("serialNumber", sql.NVarChar, request.serialNumber)
      .input("countStage", sql.NVarChar, request.countStage)
      .input("userId", sql.Int, userId)
      .input("scannedLocationId", sql.Int, request.scannedLocationId || null)
      .query(
        "EXEC sp_RegisterSerialReading @InventoryId, @SerialNumber, @CountStage, @UserId, @ScannedLocationId",
      );

    // Note: Count increment should now be handled by the updated stored procedure
    // If still needed, we keep this as fallback
    // await this.incrementInventoryItemCount(inventoryId, product.id, locationId, request.countStage, Number(userId));

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      locationId: locationId,
      locationName: locationName,
      message: "Leitura registrada com sucesso",
    };
  }

  // Update stored procedure to include inventory_items count increment
  async updateStoredProcedure(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const sqlContent = `
        -- Drop existing procedure
        IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterSerialReading')
        BEGIN
            DROP PROCEDURE sp_RegisterSerialReading;
        END;

        -- Create updated procedure with inventory_items count increment
        EXEC('
        CREATE PROCEDURE sp_RegisterSerialReading
            @InventoryId INT,
            @SerialNumber NVARCHAR(255),
            @CountStage NVARCHAR(10),
            @UserId INT
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
                -- Série não encontrada no inventário esperado
                SELECT @ProductId = si.productId, @LocationId = si.locationId
                FROM stock_items si
                JOIN products p ON si.productId = p.id
                WHERE si.serialNumber = @SerialNumber
                AND p.hasSerialControl = 1
                AND si.isActive = 1;

                IF @ProductId IS NOT NULL
                BEGIN
                    -- Série existe mas não estava no inventário - adicionar como EXTRA
                    INSERT INTO inventory_serial_items (
                        inventoryId, stockItemId, serialNumber, productId, locationId, 
                        expectedStatus, status, createdAt, updatedAt
                    )
                    SELECT 
                        @InventoryId, si.id, @SerialNumber, @ProductId, @LocationId,
                        0, ''EXTRA'', GETDATE(), GETDATE()
                    FROM stock_items si
                    WHERE si.serialNumber = @SerialNumber
                    AND si.productId = @ProductId;
                END
                ELSE
                BEGIN
                    RAISERROR(''Número de série não encontrado no sistema'', 16, 1);
                    RETURN;
                END;
            END;

            -- Atualizar inventory_serial_items
            UPDATE inventory_serial_items 
            SET 
                count1_found = CASE WHEN @CountStage = ''count1'' THEN 1 ELSE count1_found END,
                count2_found = CASE WHEN @CountStage = ''count2'' THEN 1 ELSE count2_found END,
                count3_found = CASE WHEN @CountStage = ''count3'' THEN 1 ELSE count3_found END,
                count4_found = CASE WHEN @CountStage = ''count4'' THEN 1 ELSE count4_found END,
                count1_by = CASE WHEN @CountStage = ''count1'' THEN @UserId ELSE count1_by END,
                count2_by = CASE WHEN @CountStage = ''count2'' THEN @UserId ELSE count2_by END,
                count3_by = CASE WHEN @CountStage = ''count3'' THEN @UserId ELSE count3_by END,
                count4_by = CASE WHEN @CountStage = ''count4'' THEN @UserId ELSE count4_by END,
                count1_at = CASE WHEN @CountStage = ''count1'' THEN GETDATE() ELSE count1_at END,
                count2_at = CASE WHEN @CountStage = ''count2'' THEN GETDATE() ELSE count2_at END,
                count3_at = CASE WHEN @CountStage = ''count3'' THEN GETDATE() ELSE count3_at END,
                count4_at = CASE WHEN @CountStage = ''count4'' THEN GETDATE() ELSE count4_at END,
                status = ''FOUND'',
                updatedAt = GETDATE()
            WHERE inventoryId = @InventoryId 
            AND serialNumber = @SerialNumber;

            SET @RowsUpdated = @@ROWCOUNT;

            IF @RowsUpdated = 0
            BEGIN
                RAISERROR(''Número de série não encontrado'', 16, 1);
                RETURN;
            END;

            -- VERIFICAR SE EXISTE REGISTRO NA INVENTORY_ITEMS
            DECLARE @InventoryItemId INT;
            SELECT @InventoryItemId = id 
            FROM inventory_items 
            WHERE inventoryId = @InventoryId 
            AND productId = @ProductId 
            AND (locationId = @LocationId OR (locationId IS NULL AND @LocationId IS NULL));

            IF @InventoryItemId IS NULL
            BEGIN
                -- Criar novo registro na inventory_items
                INSERT INTO inventory_items (
                    inventoryId, productId, locationId, expectedQuantity, 
                    status, createdAt, updatedAt
                )
                VALUES (
                    @InventoryId, @ProductId, @LocationId, 0,
                    ''PENDING'', GETDATE(), GETDATE()
                );
                SET @InventoryItemId = SCOPE_IDENTITY();
            END;

            -- INCREMENTAR CONTAGEM NA TABELA INVENTORY_ITEMS
            DECLARE @SQL NVARCHAR(MAX);
            SET @SQL = N''UPDATE inventory_items 
                SET '' + @CountStage + '' = ISNULL('' + @CountStage + '', 0) + 1,
                    '' + @CountStage + ''By = NULL,
                    '' + @CountStage + ''At = GETDATE(),
                    updatedAt = GETDATE()
                WHERE id = @InventoryItemId'';

            EXEC sp_executesql @SQL, N''@InventoryItemId INT'', @InventoryItemId;
        END
        ')
      `;

      await this.pool.request().query(sqlContent);

      return {
        success: true,
        message:
          "Stored procedure atualizada com sucesso! Agora os números de série incrementam a contagem na tabela inventory_items.",
      };
    } catch (error: any) {
      // Error updating stored procedure
      return {
        success: false,
        message: `Erro ao atualizar stored procedure: ${error.message}`,
      };
    }
  }

  // Incrementar contagem do produto na tabela inventory_items
  private async incrementInventoryItemCount(
    inventoryId: number,
    productId: number,
    locationId: number | null,
    countStage: string,
    userId?: number,
  ): Promise<void> {
    try {
      const countColumn = countStage; // count1, count2, count3, count4
      const countByColumn = `${countStage}By`;
      const countAtColumn = `${countStage}At`;

      // Check if item exists before updating, and handle NULL locationId
      const locationCondition = locationId
        ? "AND locationId = @locationId"
        : "AND locationId IS NULL";

      await this.pool
        .request()
        .input("inventoryId", sql.Int, inventoryId)
        .input("productId", sql.Int, productId)
        .input(
          "locationId",
          locationId ? sql.Int : sql.VarChar,
          locationId || null,
        ).query(`
          UPDATE inventory_items 
          SET 
            ${countColumn} = ISNULL(${countColumn}, 0) + 1,
            ${countByColumn} = NULL,
            ${countAtColumn} = GETDATE(),
            updatedAt = GETDATE()
          WHERE inventoryId = @inventoryId 
          AND productId = @productId 
          ${locationCondition}
        `);
    } catch (error) {
      // Error incrementing inventory item count
      // Don't throw error to avoid breaking the serial reading process
    }
  }

  // Buscar produto por número de série
  async findProductBySerial(serialNumber: string): Promise<Product | null> {
    const result = await this.pool
      .request()
      .input("serialNumber", sql.NVarChar, serialNumber).query(`
        SELECT DISTINCT p.* FROM products p
        JOIN stock_items si ON p.id = si.productId
        WHERE si.serialNumber = @serialNumber
        AND si.isActive = 1
      `);

    if (result.recordset.length === 0) return null;

    const product = result.recordset[0];
    return {
      ...product,
      createdAt: new Date(product.createdAt).getTime(),
      updatedAt: new Date(product.updatedAt).getTime(),
    };
  }

  // Validar se número de série existe
  async validateSerialExists(serialNumber: string): Promise<boolean> {
    const result = await this.pool
      .request()
      .input("serialNumber", sql.NVarChar, serialNumber).query(`
        SELECT COUNT(*) as count FROM stock_items 
        WHERE serialNumber = @serialNumber AND isActive = 1
      `);

    return result.recordset[0].count > 0;
  }

  // Buscar histórico de um número de série
  async getSerialHistory(serialNumber: string): Promise<InventorySerialItem[]> {
    const result = await this.pool
      .request()
      .input("serialNumber", sql.NVarChar, serialNumber).query(`
        SELECT 
          isi.*, i.code as inventoryCode, i.startDate
        FROM inventory_serial_items isi
        JOIN inventories i ON isi.inventoryId = i.id
        WHERE isi.serialNumber = @serialNumber
        ORDER BY i.startDate DESC
      `);

    return result.recordset.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      count1_at: row.count1_at ? new Date(row.count1_at).getTime() : undefined,
      count2_at: row.count2_at ? new Date(row.count2_at).getTime() : undefined,
      count3_at: row.count3_at ? new Date(row.count3_at).getTime() : undefined,
      count4_at: row.count4_at ? new Date(row.count4_at).getTime() : undefined,
    }));
  }

  // Atualizar item de série
  async updateInventorySerialItem(
    id: number,
    data: Partial<InventorySerialItem>,
  ): Promise<InventorySerialItem> {
      const updateFields: string[] = [];
    const request = this.pool.request().input("id", sql.Int, id);

    if (data.status !== undefined) {
      updateFields.push("status = @status");
      request.input("status", sql.NVarChar, data.status);
    }

    if (data.notes !== undefined) {
      updateFields.push("notes = @notes");
      request.input("notes", sql.NVarChar, data.notes);
    }

    if (data.finalStatus !== undefined) {
      updateFields.push("finalStatus = @finalStatus");
      request.input("finalStatus", sql.Bit, data.finalStatus);
    }

    updateFields.push("updatedAt = GETDATE()");

    await request.query(`
      UPDATE inventory_serial_items 
      SET ${updateFields.join(", ")}
      WHERE id = @id
    `);

    //    // Retornar item atualizado
    const result = await this.pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM inventory_serial_items WHERE id = @id");

    const item = result.recordset[0];
    return {
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      updatedAt: new Date(item.updatedAt).getTime(),
      count1_at: item.count1_at
        ? new Date(item.count1_at).getTime()
        : undefined,
      count2_at: item.count2_at
        ? new Date(item.count2_at).getTime()
        : undefined,
      count3_at: item.count3_at
        ? new Date(item.count3_at).getTime()
        : undefined,
      count4_at: item.count4_at
        ? new Date(item.count4_at).getTime()
        : undefined,
    };
  }

  // Reconciliação de quantidades
  async reconcileInventoryQuantities(inventoryId: number): Promise<void> {
    const query = `
      UPDATE ii 
      SET 
        serialItemsFound = ISNULL((
          SELECT COUNT(*) FROM inventory_serial_items isi 
          WHERE isi.inventoryId = ii.inventoryId 
          AND isi.productId = ii.productId 
          AND isi.locationId = ii.locationId
          AND isi.status = 'FOUND'
        ), 0),
        serialItemsMissing = ISNULL((
          SELECT COUNT(*) FROM inventory_serial_items isi           WHERE isi.inventoryId = ii.inventoryId 
          AND isi.productId = ii.productId           AND isi.locationId = ii.locationId
          AND isi.status IN ('PENDING', 'MISSING')
        ), 0)
      FROM inventory_items ii
      WHERE ii.inventoryId = @inventoryId
    `;

    await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .query(query);
  }

  // Executar reconciliação de números de série
  async reconcileInventorySerial(inventoryId: number): Promise<void> {
    await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId)
      .query("EXEC sp_ReconcileInventorySerial @inventoryId");
  }

  // Buscar dados de reconciliação
  async getInventoryReconciliation(inventoryId: number): Promise<any[]> {
    const result = await this.pool
      .request()
      .input("inventoryId", sql.Int, inventoryId).query(`
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
            WHEN ii.serialItemsCount > 0 AND ISNULL(ii.finalQuantity, 0) != ISNULL(ii.serialItemsFound, 0) 
            THEN 1 ELSE 0 
          END as hasDiscrepancy
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN locations l ON ii.locationId = l.id
        WHERE ii.inventoryId = @inventoryId
      `);

    return result.recordset;
  }

  // Buscar produtos com controle de série
  async getProductsWithSerialControl(): Promise<ProductWithSerialControl[]> {
    try {
      const request = this.pool.request();
      const result = await request.query(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          ISNULL(p.description, '') as description,
          p.partNumber,
          ISNULL(c.name, '') as categoryName,
          ISNULL(p.hasSerialControl, 0) as hasSerialControl
        FROM products p
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE p.isActive = 1
        ORDER BY p.name
      `);

      // Products with serial control info found
      return result.recordset;
    } catch (error) {
      // Error fetching products with serial control
      throw error;
    }
  }

  async searchProducts(searchTerm: string, limit: number = 10): Promise<any[]> {
    try {
      const request = this.pool.request();
      const searchPattern = `%${searchTerm.toLowerCase()}%`;

      // Searching products with term

      const result = await request
        .input("searchTerm", searchPattern)
        .input("limit", limit).query(`
          SELECT TOP (@limit)
            p.id,
            p.sku,
            p.name,
            p.description,
            p.partNumber,
            ISNULL(c.name, '') as categoryName,
            0 as hasSerialControl
          FROM products p
          LEFT JOIN categories c ON p.categoryId = c.id
          WHERE (
            LOWER(p.sku) LIKE @searchTerm 
            OR LOWER(p.name) LIKE @searchTerm
            OR LOWER(ISNULL(p.description, '')) LIKE @searchTerm
            OR LOWER(ISNULL(p.partNumber, '')) LIKE @searchTerm
          )
          AND p.isActive = 1
          ORDER BY 
            CASE 
              WHEN LOWER(p.sku) LIKE @searchTerm THEN 1
              WHEN LOWER(p.name) LIKE @searchTerm THEN 2
              ELSE 3
            END,
            p.name
        `);

      // Search returned results
      return result.recordset;
    } catch (error) {
      // Error searching products
      throw error;
    }
  }

  // ===== MÉTODOS PARA INTEGRAÇÃO E TESTES =====

  async reconcileInventory(inventoryId: number): Promise<void> {
    const query = `
      UPDATE inventory_items 
      SET 
        serialItemsCount = COALESCE((
          SELECT COUNT(*) FROM inventory_serial_items isi 
          WHERE isi.inventoryId = inventory_items.inventoryId 
          AND isi.productId = inventory_items.productId
        ), 0),
        serialItemsFound = COALESCE((
          SELECT COUNT(*) FROM inventory_serial_items isi 
          WHERE isi.inventoryId = inventory_items.inventoryId 
          AND isi.productId = inventory_items.productId
          AND (isi.count1_found = 1 OR isi.count2_found = 1 OR isi.count3_found = 1 OR isi.count4_found = 1)
        ), 0),
        hasSerialDiscrepancy = CASE 
          WHEN EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = inventory_items.productId 
            AND p.hasSerialControl = 1
          ) THEN 1 ELSE 0 END
      WHERE inventoryId = @inventoryId
    `;

    await this.pool.request().input("inventoryId", inventoryId).query(query);
  }

  async createInventorySerialItems2(inventoryId: number): Promise<void> {
    // Implementação simplificada - criar registros baseados nos stock_items
    const query = `
      INSERT INTO inventory_serial_items (
        inventoryId, stockItemId, serialNumber, productId, locationId, 
        expectedStatus, status, createdAt, updatedAt
      )
      SELECT 
        @inventoryId,
        si.id,
        si.serialNumber,
        si.productId,
        si.locationId,
        1,
        'PENDING',
        @timestamp,
        @timestamp
      FROM stock_items si
      INNER JOIN products p ON si.productId = p.id
      WHERE si.isActive = 1 
      AND p.hasSerialControl = 1
      AND NOT EXISTS (
        SELECT 1 FROM inventory_serial_items isi 
        WHERE isi.inventoryId = @inventoryId 
        AND isi.stockItemId = si.id
      )
    `;

    await this.pool
      .request()
      .input("inventoryId", inventoryId)
      .input("timestamp", Date.now())
      .query(query);
  }

  // Get inventory items with divergences for ERP migration
  async getInventoryItemsWithDivergences(inventoryId: number): Promise<any[]> {
    const result = await this.pool.request().input("inventoryId", inventoryId)
      .query(`
        SELECT 
          ii.*,
          p.sku,
          p.name as productName,
          p.description as productDescription,
          p.costValue,
          l.code as locationCode,
          l.name as locationName
        FROM inventory_items ii
        LEFT JOIN products p ON ii.productId = p.id
        LEFT JOIN locations l ON ii.locationId = l.id
        WHERE ii.inventoryId = @inventoryId
          AND ii.finalQuantity IS NOT NULL
          AND ii.finalQuantity != ii.expectedQuantity
        ORDER BY p.sku, l.code
      `);

    return result.recordset.map((item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
      product: {
        id: item.productId,
        sku: item.sku || "N/A",
        name: item.productName || "Produto não encontrado",
        description: item.productDescription || "Sem descrição",
        costValue: item.costValue || 0,
        categoryId: 0,
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      location: {
        id: item.locationId,
        code: item.locationCode || "N/A",
        name: item.locationName || "Local não encontrado",
        description: "",
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }));
  }

  async createAuditLog(
    auditLog: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const request = this.pool.request();
    try {
      // Convert timestamp to datetime for SQL Server compatibility
      const timestamp = new Date();

      const result = await request
        .input("userId", auditLog.userId)
        .input("action", auditLog.action)
        .input("entityType", auditLog.entityType)
        .input("entityId", auditLog.entityId)
        .input("oldValues", auditLog.oldValues || null)
        .input("newValues", auditLog.newValues || null)
        .input("metadata", auditLog.metadata || null)
        .input("timestamp", timestamp).query(`
          INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
          OUTPUT INSERTED.*
          VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, @timestamp)
        `);

      const record = result.recordset[0];
      return {
        ...record,
        timestamp:
          typeof record.timestamp === "number" ? record.timestamp : Date.now(),
      };
    } catch (error) {
      // Log error but don't throw - audit log shouldn't break main functionality
      // Warning: Failed to create audit log
      return {
        id: 0,
        userId: 0,
        action: "",
        entityType: "",
        entityId: "",
        oldValues: "",
        newValues: "",
        metadata: "",
        timestamp: Date.now(),
      };
    }
  }

  // ===== ERP INTEGRATION METHODS =====

  // Garantir que colunas ERP existem na tabela inventories
  async ensureERPColumns(): Promise<void> {
    try {
      // Verificar se as colunas ERP existem
      const checkQuery = `
        SELECT 
          COLUMN_NAME 
        FROM 
          INFORMATION_SCHEMA.COLUMNS 
        WHERE 
          TABLE_NAME = 'inventories' 
          AND COLUMN_NAME IN ('erpMigrated', 'erpMigratedAt', 'erpMigratedBy')
      `;
      
      const result = await this.pool.request().query(checkQuery);
      const existingColumns = result.recordset.map(row => row.COLUMN_NAME);
      
      // Adicionar colunas se não existirem
      if (!existingColumns.includes('erpMigrated')) {
        await this.pool.request().query('ALTER TABLE inventories ADD erpMigrated BIT DEFAULT 0');
        // Coluna erpMigrated adicionada à tabela inventories
      }
      
      if (!existingColumns.includes('erpMigratedAt')) {
        await this.pool.request().query('ALTER TABLE inventories ADD erpMigratedAt DATETIME2 NULL');
        // Coluna erpMigratedAt adicionada à tabela inventories
      }
      
      if (!existingColumns.includes('erpMigratedBy')) {
        await this.pool.request().query('ALTER TABLE inventories ADD erpMigratedBy INT NULL');
        // Coluna erpMigratedBy adicionada à tabela inventories
      }
      
    } catch (error) {
      // Erro ao verificar/criar colunas ERP
      throw error;
    }
  }

  // Marcar inventário como migrado para ERP
  async markInventoryAsMigrated(inventoryId: number, userId: number): Promise<void> {
    try {
      const now = new Date();
      
      const updateQuery = `
        UPDATE inventories 
        SET 
          erpMigrated = 1,
          erpMigratedAt = @migratedAt,
          erpMigratedBy = @migratedBy,
          updatedAt = @updatedAt
        WHERE id = @inventoryId
      `;
      
      await this.pool
        .request()
        .input('inventoryId', inventoryId)
        .input('migratedAt', now)
        .input('migratedBy', userId)
        .input('updatedAt', now)
        .query(updateQuery);
        
      // Inventário marcado como migrado para ERP
      
    } catch (error) {
      // Erro ao marcar inventário como migrado
      throw error;
    }
  }

  // Adicionar novas categorias a um inventário existente
  async addCategoriesToInventory(
    inventoryId: number,
    newCategoryIds: number[],
    userId: number
  ): Promise<void> {
    const transaction = this.pool.transaction();
    
    try {
      await transaction.begin();
      
      // Verificar se o inventário existe e está aberto
      const inventoryQuery = `
        SELECT id, status, selectedCategoryIds, selectedLocationIds
        FROM inventories 
        WHERE id = @inventoryId
      `;
      
      const inventoryResult = await transaction
        .request()
        .input('inventoryId', inventoryId)
        .query(inventoryQuery);
        
      if (inventoryResult.recordset.length === 0) {
        throw new Error('Inventário não encontrado');
      }
      
      const inventory = inventoryResult.recordset[0];
      
      // Permitir adicionar categorias até a 2ª contagem
      const allowedStatuses = ['open', 'count1_open', 'count1_closed', 'count2_open'];
      if (!allowedStatuses.includes(inventory.status)) {
        throw new Error('Só é possível adicionar categorias a inventários até a 2ª contagem');
      }
      
      // Parse das categorias e localizações já selecionadas
      const currentCategoryIds = JSON.parse(inventory.selectedCategoryIds || '[]');
      const selectedLocationIds = JSON.parse(inventory.selectedLocationIds || '[]');
      
      // Filtrar apenas categorias que ainda não estão no inventário
      const categoriesToAdd = newCategoryIds.filter(id => !currentCategoryIds.includes(id));
      
      if (categoriesToAdd.length === 0) {
        throw new Error('Todas as categorias selecionadas já estão incluídas no inventário');
      }
      
      // Atualizar selectedCategoryIds no inventário
      const updatedCategoryIds = [...currentCategoryIds, ...categoriesToAdd];
      
      const updateInventoryQuery = `
        UPDATE inventories 
        SET 
          selectedCategoryIds = @selectedCategoryIds,
          updatedAt = @updatedAt
        WHERE id = @inventoryId
      `;
      
      await transaction
        .request()
        .input('inventoryId', inventoryId)
        .input('selectedCategoryIds', JSON.stringify(updatedCategoryIds))
        .input('updatedAt', new Date())
        .query(updateInventoryQuery);
      
      // Criar inventory_items para produtos das novas categorias
      for (const categoryId of categoriesToAdd) {
        for (const locationId of selectedLocationIds) {
          // Buscar produtos da categoria que têm estoque na localização
          const stockQuery = `
            SELECT DISTINCT p.id as productId, s.quantity as stockQuantity
            FROM products p
            INNER JOIN stock s ON p.id = s.productId
            WHERE p.categoryId = @categoryId 
              AND s.locationId = @locationId
              AND s.quantity > 0
          `;
          
          const stockResult = await transaction
            .request()
            .input('categoryId', categoryId)
            .input('locationId', locationId)
            .query(stockQuery);
          
          // Criar inventory_item para cada produto encontrado
          for (const stockItem of stockResult.recordset) {
            const insertItemQuery = `
              INSERT INTO inventory_items (
                inventoryId, productId, locationId, expectedQuantity,
                count1, count2, count3, count4, finalQuantity, difference,
                status, createdAt, updatedAt
              )
              VALUES (
                @inventoryId, @productId, @locationId, @expectedQuantity,
                NULL, NULL, NULL, NULL, NULL, NULL,
                'pending', @createdAt, @updatedAt
              )
            `;
            
            await transaction
              .request()
              .input('inventoryId', inventoryId)
              .input('productId', stockItem.productId)
              .input('locationId', locationId)
              .input('expectedQuantity', stockItem.stockQuantity)
              .input('createdAt', new Date())
              .input('updatedAt', new Date())
              .query(insertItemQuery);
          }
        }
      }
      
      // Criar serial items para produtos com controle de série das novas categorias
      const serialProductsQuery = `
        SELECT DISTINCT p.id as productId
        FROM products p
        WHERE p.categoryId IN (${categoriesToAdd.map(() => '?').join(',')})
          AND p.hasSerialControl = 1
      `;
      
      const serialProductsResult = await transaction
        .request()
        .query(serialProductsQuery.replace(/\?/g, () => {
          const categoryId = categoriesToAdd.shift();
          return categoryId?.toString() || '0';
        }));
      
      // Reset categoriesToAdd para usar novamente
      const resetCategoriesToAdd = newCategoryIds.filter(id => !currentCategoryIds.includes(id));
      
      for (const serialProduct of serialProductsResult.recordset) {
        for (const locationId of selectedLocationIds) {
          // Buscar números de série do produto na localização usando tabelas base
          const serialsQuery = `
            SELECT 
              ES.id as stockItemId, 
              ES.NumSerie as serialNumber
            FROM Locador..tbl_EstoqueSerial ES
            INNER JOIN Locador..tbl_Produtos P ON P.CodProduto = ES.CodProduto
            LEFT JOIN Locador..tbl_ProdutoSerial PS ON PS.NumSerie = ES.NumSerie
            WHERE P.id = @productId 
              AND ES.CodLocalizacao = @locationId 
              AND ISNULL(PS.FlgAtivo, 1) = 1
          `;
          
          const serialsResult = await transaction
            .request()
            .input('productId', serialProduct.productId)
            .input('locationId', locationId)
            .query(serialsQuery);
          

          
          // Criar inventory_serial_items apenas se houver seriais
          if (serialsResult.recordset && serialsResult.recordset.length > 0) {
            for (const serial of serialsResult.recordset) {
            const insertSerialQuery = `
              INSERT INTO inventory_serial_items (
                inventoryId, stockItemId, productId, locationId, serialNumber,
                status, createdAt, updatedAt
              )
              VALUES (
                @inventoryId, @stockItemId, @productId, @locationId, @serialNumber,
                'pending', @createdAt, @updatedAt
              )
            `;
            
            await transaction
              .request()
              .input('inventoryId', inventoryId)
              .input('stockItemId', serial.stockItemId)
              .input('productId', serialProduct.productId)
              .input('locationId', locationId)
              .input('serialNumber', serial.serialNumber)
              .input('createdAt', new Date())
              .input('updatedAt', new Date())
              .query(insertSerialQuery);
            }
          } else {

          }
        }
      }
      
      // Log da ação
      const auditLogQuery = `
        INSERT INTO audit_logs (userId, action, entityType, entityId, metadata, timestamp)
        VALUES (@userId, @action, @entityType, @entityId, @metadata, @timestamp)
      `;
      
      await transaction
        .request()
        .input('userId', userId)
        .input('action', 'add_categories')
        .input('entityType', 'inventory')
        .input('entityId', inventoryId.toString())
        .input('metadata', JSON.stringify({ addedCategoryIds: resetCategoriesToAdd }))
        .input('timestamp', new Date())
        .query(auditLogQuery);
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ===== SERIAL DISCREPANCIES METHODS =====

  // Buscar divergências de números de série
  async getSerialDiscrepancies(params: {
    inventoryId: number;
    type?: string;
    status?: string;
    page: number;
    limit: number;
  }): Promise<{ discrepancies: any[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      let whereClause = 'WHERE inventoryId = @inventoryId';
      const request = this.pool.request().input('inventoryId', params.inventoryId);

      if (params.type) {
        whereClause += ' AND discrepancyType = @type';
        request.input('type', params.type);
      }

      if (params.status) {
        whereClause += ' AND status = @status';
        request.input('status', params.status);
      }

      // Contar total
      const countQuery = `SELECT COUNT(*) as total FROM inventory_serial_discrepancies ${whereClause}`;
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0].total;

      // Buscar itens paginados
      const offset = (params.page - 1) * params.limit;
      const itemsQuery = `
        SELECT *
        FROM inventory_serial_discrepancies
        ${whereClause}
        ORDER BY createdAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      request.input('offset', offset).input('limit', params.limit);
      const itemsResult = await request.query(itemsQuery);

      const totalPages = Math.ceil(total / params.limit);

      return {
        discrepancies: itemsResult.recordset,
        total,
        page: params.page,
        limit: params.limit,
        totalPages
      };
    } catch (error) {
      console.error('Erro ao buscar divergências de série:', error);
      throw error;
    }
  }

  // Obter resumo das divergências
  async getSerialDiscrepanciesSummary(inventoryId: number): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as totalDiscrepancies,
          SUM(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 ELSE 0 END) as locationMismatches,
          SUM(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
          SUM(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 ELSE 0 END) as unexpectedFound,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'MIGRATED_TO_ERP' THEN 1 ELSE 0 END) as migratedToERP
        FROM inventory_serial_discrepancies
        WHERE inventoryId = @inventoryId
      `;

      const result = await this.pool
        .request()
        .input('inventoryId', inventoryId)
        .query(query);

      const row = result.recordset[0];
      return {
        total: row.totalDiscrepancies,
        locationMismatch: row.locationMismatches,
        notFound: row.notFound,
        unexpectedFound: row.unexpectedFound,
        pending: row.pending,
        resolved: row.resolved,
        migrated: row.migratedToERP
      };
    } catch (error) {
      console.error('Erro ao buscar resumo de divergências:', error);
      throw error;
    }
  }

  // Processar divergências de um inventário
  async processSerialDiscrepancies(inventoryId: number): Promise<any> {
    try {
      const result = await this.pool
        .request()
        .input('InventoryId', inventoryId)
        .execute('sp_ProcessSerialDiscrepancies');

      return result.recordset[0];
    } catch (error) {
      logger.error('Erro ao processar divergências:', error);
      throw error;
    }
  }

  // Resolver divergência
  async resolveSerialDiscrepancy(
    discrepancyId: number,
    userId: number,
    resolutionNotes?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE inventory_serial_discrepancies
        SET 
          status = 'RESOLVED',
          resolvedBy = @userId,
          resolvedAt = GETDATE(),
          resolutionNotes = @resolutionNotes,
          updatedAt = GETDATE()
        WHERE id = @discrepancyId
      `;

      await this.pool
        .request()
        .input('discrepancyId', discrepancyId)
        .input('userId', userId.toString())
        .input('resolutionNotes', resolutionNotes || null)
        .query(query);
    } catch (error) {
      console.error('Erro ao resolver divergência:', error);
      throw error;
    }
  }

  // Marcar divergências como migradas para ERP
  async markDiscrepanciesAsMigrated(
    inventoryId: number,
    userId: string,
    erpResponse?: string
  ): Promise<{ migratedCount: number }> {
    try {
      const result = await this.pool
        .request()
        .input('InventoryId', inventoryId)
        .input('UserId', userId)
        .input('ERPResponse', erpResponse || null)
        .execute('sp_MarkDiscrepanciesAsMigrated');

      return { migratedCount: result.recordset[0].migratedCount };
    } catch (error) {
      console.error('Erro ao marcar divergências como migradas:', error);
      throw error;
    }
  }
}
