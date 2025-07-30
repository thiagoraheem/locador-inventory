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
  InventoryStockItem,
  InsertInventoryStockItem,
  Count,
  InsertCount,
  AuditLog,
  InsertAuditLog,
  Company,
  StockItem,
  ControlPanelStats,
  InventoryStatus,
  InventorySerialItem,
  InsertInventorySerialItem,
  ProductWithSerialControl,
  InventoryItemWithSerial,
  SerialReadingRequest,
  SerialReadingResponse,
} from "@shared/schema";

export class SimpleStorage {
  private pool: sql.ConnectionPool;

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

    return result.recordset.map(inventory => ({
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : null,
      predictedEndDate: inventory.predictedEndDate ? new Date(inventory.predictedEndDate).getTime() : null,
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
      selectedLocationIds: inventory.selectedLocationIds ? JSON.parse(inventory.selectedLocationIds) : null,
      selectedCategoryIds: inventory.selectedCategoryIds ? JSON.parse(inventory.selectedCategoryIds) : null,
    }));
  }

  async getInventory(id: number) {
    const result = await this.pool.request()
      .input('id', sql.Int, id)
      .query(`
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
      predictedEndDate: inventory.predictedEndDate ? new Date(inventory.predictedEndDate).getTime() : null,
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
      selectedLocationIds: inventory.selectedLocationIds ? JSON.parse(inventory.selectedLocationIds) : null,
      selectedCategoryIds: inventory.selectedCategoryIds ? JSON.parse(inventory.selectedCategoryIds) : null,
    };
  }

  async createInventory(
    inventoryData: Omit<InsertInventory, "id">,
  ): Promise<Inventory> {
    const request = this.pool.request();

    // Handle optional fields with proper types
    const selectedLocationIds = inventoryData.selectedLocationIds ? JSON.stringify(inventoryData.selectedLocationIds) : null;
    const selectedCategoryIds = inventoryData.selectedCategoryIds ? JSON.stringify(inventoryData.selectedCategoryIds) : null;
    const predictedEndDate = inventoryData.predictedEndDate ? 
      (typeof inventoryData.predictedEndDate === 'number' ? new Date(inventoryData.predictedEndDate) : new Date(inventoryData.predictedEndDate)) : null;

    await request
      .input("code", inventoryData.code)
      .input("typeId", inventoryData.typeId)
      .input("status", inventoryData.status || "open")
      .input("startDate", typeof inventoryData.startDate === 'number' ? new Date(inventoryData.startDate) : new Date(inventoryData.startDate))
      .input(
        "endDate",
        inventoryData.endDate ? (typeof inventoryData.endDate === 'number' ? new Date(inventoryData.endDate) : new Date(inventoryData.endDate)) : null,
      )
      .input("predictedEndDate", predictedEndDate)
      .input("description", inventoryData.description || null)
      .input("selectedLocationIds", selectedLocationIds)
      .input("selectedCategoryIds", selectedCategoryIds)
      .input("createdBy", inventoryData.createdBy)
      .input("createdAt", new Date())
      .input("updatedAt", new Date()).query(`
        INSERT INTO inventories (code, typeId, status, startDate, endDate, predictedEndDate, description, selectedLocationIds, selectedCategoryIds, createdBy, createdAt, updatedAt)
        VALUES (@code, @typeId, @status, @startDate, @endDate, @predictedEndDate, @description, @selectedLocationIds, @selectedCategoryIds, @createdBy, @createdAt, @updatedAt)
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
      predictedEndDate: inventory.predictedEndDate ? new Date(inventory.predictedEndDate).getTime() : null,
      selectedLocationIds: inventory.selectedLocationIds ? JSON.parse(inventory.selectedLocationIds) : null,
      selectedCategoryIds: inventory.selectedCategoryIds ? JSON.parse(inventory.selectedCategoryIds) : null,
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
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
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
        .input("currentId", sql.VarChar, id)
        .query("SELECT id FROM users WHERE username = @username AND id != @currentId");

      if (existingUser.recordset.length > 0) {
        throw new Error("Username already exists");
      }
    }

    const setParts = [];
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
      .input("id", sql.VarChar, id)
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
  async createInventoryWithSelection(inventoryData: InsertInventory): Promise<Inventory> {
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
      .input("endDate", newInventory.endDate ? new Date(newInventory.endDate) : null)
      .input("predictedEndDate", newInventory.predictedEndDate ? new Date(newInventory.predictedEndDate) : null)
      .input("description", newInventory.description || null)
      .input("selectedLocationIds", inventoryData.selectedLocationIds ? JSON.stringify(inventoryData.selectedLocationIds) : null)
      .input("selectedCategoryIds", inventoryData.selectedCategoryIds ? JSON.stringify(inventoryData.selectedCategoryIds) : null)
      .input("createdBy", newInventory.createdBy)
      .input("createdAt", new Date(newInventory.createdAt))
      .input("updatedAt", new Date(newInventory.updatedAt))
      .query(`
        INSERT INTO inventories (code, typeId, status, startDate, endDate, predictedEndDate, description, selectedLocationIds, selectedCategoryIds, createdBy, createdAt, updatedAt)
        OUTPUT INSERTED.*
        VALUES (@code, @typeId, @status, @startDate, @endDate, @predictedEndDate, @description, @selectedLocationIds, @selectedCategoryIds, @createdBy, @createdAt, @updatedAt)
      `);

    const inventory = result.recordset[0];
    return {
      ...inventory,
      createdAt: new Date(inventory.createdAt).getTime(),
      updatedAt: new Date(inventory.updatedAt).getTime(),
      startDate: new Date(inventory.startDate).getTime(),
      endDate: inventory.endDate ? new Date(inventory.endDate).getTime() : undefined,
      predictedEndDate: inventory.predictedEndDate ? new Date(inventory.predictedEndDate).getTime() : undefined,
      selectedLocationIds: inventory.selectedLocationIds ? JSON.parse(inventory.selectedLocationIds) : undefined,
      selectedCategoryIds: inventory.selectedCategoryIds ? JSON.parse(inventory.selectedCategoryIds) : undefined,
    };
  }

  // Transition inventory status
  async transitionInventoryStatus(inventoryId: number, newStatus: InventoryStatus, userId: number): Promise<void> {
    const request = this.pool.request();
    await request
      .input("id", inventoryId)
      .input("status", newStatus)
      .input("updatedAt", new Date())
      .query(`
        UPDATE inventories 
        SET status = @status, updatedAt = @updatedAt
        WHERE id = @id
      `);

    // Log the status transition
    await this.createAuditLog({
      userId,
      action: "INVENTORY_STATUS_CHANGE",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      newValues: JSON.stringify({ status: newStatus }),
      metadata: JSON.stringify({ timestamp: Date.now() }),
    });
  }

  // Get inventory statistics for Control Panel
  async getInventoryStats(inventoryId: number): Promise<ControlPanelStats> {
    const request = this.pool.request();

    const [inventoryResult, itemsResult, countsResult] = await Promise.all([
      request.input("id", inventoryId).query(`
        SELECT COUNT(*) as activeInventories FROM inventories 
        WHERE status NOT IN ('closed', 'cancelled')
      `),
      request.input("inventoryId", inventoryId).query(`
        SELECT 
          COUNT(*) as totalItems,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedItems,
          AVG(CASE WHEN accuracy IS NOT NULL THEN accuracy END) as avgAccuracy,
          COUNT(CASE WHEN difference > 0 THEN 1 END) as divergenceCount
        FROM inventory_items 
        WHERE inventoryId = @inventoryId
      `),
      request.input("inventoryId2", inventoryId).query(`
        SELECT 
          COUNT(CASE WHEN count1 IS NOT NULL THEN 1 END) as count1Total,
          COUNT(CASE WHEN count2 IS NOT NULL THEN 1 END) as count2Total,
          COUNT(CASE WHEN count3 IS NOT NULL THEN 1 END) as count3Total,
          COUNT(CASE WHEN count4 IS NOT NULL THEN 1 END) as auditTotal
        FROM inventory_items 
        WHERE inventoryId = @inventoryId2
      `)
    ]);

    const items = itemsResult.recordset[0];
    const counts = countsResult.recordset[0];

    return {
      totalInventories: 1,
      activeInventories: inventoryResult.recordset[0].activeInventories,
      itemsInProgress: items.totalItems - items.completedItems,
      itemsCompleted: items.completedItems,
      accuracyRate: 0, // Removed accuracy calculation due to missing columns
      divergenceCount: 0, // Removed divergence calculation due to missing columns
      countingProgress: {
        count1: counts.count1Total,
        count2: counts.count2Total,
        count3: counts.count3Total,
        audit: counts.auditTotal,
      },
    };
  }

  // Update individual count methods
  async updateCount1(itemId: number, count: number, countedBy: string): Promise<void> {
    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count1", count)
      .input("count1By", countedBy)
      .input("count1At", new Date())
      .input("updatedAt", new Date())
      .query(`
        UPDATE inventory_items 
        SET count1 = @count1, count1By = @count1By, count1At = @count1At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount2(itemId: number, count: number, countedBy: string): Promise<void> {
    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count2", count)
      .input("count2By", countedBy)
      .input("count2At", new Date())
      .input("updatedAt", new Date())
      .query(`
        UPDATE inventory_items 
        SET count2 = @count2, count2By = @count2By, count2At = @count2At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount3(itemId: number, count: number, countedBy: string): Promise<void> {
    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count3", count)
      .input("count3By", countedBy)
      .input("count3At", new Date())
      .input("updatedAt", new Date())
      .query(`
        UPDATE inventory_items 
        SET count3 = @count3, count3By = @count3By, count3At = @count3At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  async updateCount4(itemId: number, count: number, countedBy: string): Promise<void> {
    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count4", count)
      .input("count4By", countedBy)
      .input("count4At", new Date())
      .input("updatedAt", new Date())
      .query(`
        UPDATE inventory_items 
        SET count4 = @count4, count4By = @count4By, count4At = @count4At, updatedAt = @updatedAt
        WHERE id = @id
      `);
  }

  // Calculate difference and accuracy (simplified - no need to update DB since columns don't exist)
  private async calculateAndUpdateDifference(itemId: number): Promise<void> {
    // This method is disabled - columns difference/accuracy don't exist in current schema
    return;
  }

  // Inventory Stock Items methods (for patrimônio)
  async createInventoryStockItem(data: InsertInventoryStockItem): Promise<InventoryStockItem> {
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
      .input("updatedAt", new Date(newItem.updatedAt))
      .query(`
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

  async getInventoryStockItems(inventoryId: number): Promise<InventoryStockItem[]> {
    const result = await this.pool
      .request()
      .input("inventoryId", inventoryId)
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

  async updateInventoryStockItemCount(itemId: number, countData: { count: number; countBy: string; countType: 'count1' | 'count2' | 'count3' | 'count4' }): Promise<void> {
    const { count, countBy, countType } = countData;
    const countByField = `${countType}By`;
    const countAtField = `${countType}At`;

    const request = this.pool.request();
    await request
      .input("id", itemId)
      .input("count", count)
      .input("countBy", countBy)
      .input("countAt", new Date())
      .input("updatedAt", new Date())
      .query(`
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
  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    const request = this.pool.request();
    const result = await request
      .input("inventoryId", itemData.inventoryId)
      .input("productId", itemData.productId)
      .input("locationId", itemData.locationId)
      .input("expectedQuantity", itemData.expectedQuantity)
      .input("status", itemData.status || 'pending')
      .input("createdAt", new Date())
      .input("updatedAt", new Date())
      .query(`
        INSERT INTO inventory_items (inventoryId, productId, locationId, expectedQuantity, status, createdAt, updatedAt)
        OUTPUT INSERTED.*
        VALUES (@inventoryId, @productId, @locationId, @expectedQuantity, @status, @createdAt, @updatedAt)
      `);

    const item = result.recordset[0];
    return {
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
    };
  }

  // Get inventory items
  async getInventoryItems(): Promise<InventoryItem[]> {
    const result = await this.pool
      .request()
      .query("SELECT * FROM inventory_items ORDER BY id");

    return result.recordset.map(item => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
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
      const [productsResult, categoriesResult, locationsResult, inventoriesResult] =
        await Promise.all([
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
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }

  async deleteInventory(id: number): Promise<void> {
    // Delete related records first (counts must be deleted before inventory_items)
    await this.pool.request()
      .input('inventoryId1', id)
      .query('DELETE FROM counts WHERE inventoryItemId IN (SELECT id FROM inventory_items WHERE inventoryId = @inventoryId1)');

    // Delete inventory items
    await this.pool.request()
      .input('inventoryId2', id)
      .query('DELETE FROM inventory_items WHERE inventoryId = @inventoryId2');

    // Finally delete the inventory itself
    await this.pool.request()
      .input('inventoryId3', id)
      .query('DELETE FROM inventories WHERE id = @inventoryId3');
  }

  // Inventory snapshot management methods
  async createInventorySnapshotTables(): Promise<void> {
    const queries = [
      // Categories snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_categories_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_categories_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           categoryId INT NOT NULL,
           idcompany INT,
           name NVARCHAR(255),
           description NVARCHAR(500),
           isActive BIT DEFAULT 1,
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Companies snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_companies_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_companies_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           companyId INT NOT NULL,
           name NVARCHAR(255),
           description NVARCHAR(500),
           isActive BIT DEFAULT 1,
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Locations snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_locations_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_locations_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           locationId INT NOT NULL,
           code NVARCHAR(50),
           name NVARCHAR(255),
           description NVARCHAR(500),
           isActive BIT DEFAULT 1,
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Products snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_products_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_products_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           productId INT NOT NULL,
           sku NVARCHAR(100),
           name NVARCHAR(255),
           description NVARCHAR(500),
           categoryId INT,
           costValue DECIMAL(18,2),
           serialNumber NVARCHAR(100),
           isActive BIT DEFAULT 1,
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Stock snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_stock_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_stock_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           stockId INT NOT NULL,
           productId INT NOT NULL,
           locationId INT NOT NULL,
           quantity INT DEFAULT 0,
           frozenAt DATETIME2 DEFAULT GETDATE(),
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Stock items snapshot table
      `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_stock_items_snapshot]') AND type in (N'U'))
       BEGIN
         CREATE TABLE inventory_stock_items_snapshot (
           id INT IDENTITY(1,1) PRIMARY KEY,
           inventoryId INT NOT NULL,
           stockItemId INT NOT NULL,
           productId INT NOT NULL,
           locationId INT NOT NULL,
           assetTag NVARCHAR(100),
           description NVARCHAR(255),
           category NVARCHAR(100),
           location NVARCHAR(100),
           locationCode NVARCHAR(50),
           costValue DECIMAL(18,2),
           currentValue DECIMAL(18,2),
           condition NVARCHAR(50),
           serialNumber NVARCHAR(100),
           brand NVARCHAR(100),
           model NVARCHAR(100),
           companyId INT,
           acquisitionDate DATETIME2,
           quantity INT DEFAULT 1,
           isActive BIT DEFAULT 1,
           frozenAt DATETIME2 DEFAULT GETDATE(),
           createdAt DATETIME2 DEFAULT GETDATE(),
           FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE
         );
       END`,

      // Add inventory freeze fields
      `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'isFrozen')
       BEGIN
         ALTER TABLE inventories ADD isFrozen BIT DEFAULT 0;
       END`,

      `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'frozenAt')
       BEGIN
         ALTER TABLE inventories ADD frozenAt DATETIME2 NULL;
       END`,

      `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[inventories]') AND name = 'frozenBy')
       BEGIN
         ALTER TABLE inventories ADD frozenBy NVARCHAR(50) NULL;
       END`
    ];

    for (const query of queries) {
      await this.pool.request().query(query);
    }
  }

  async freezeInventoryData(inventoryId: number, userId: number): Promise<void> {
    const transaction = this.pool.transaction();

    try {
      await transaction.begin();

      // Mark inventory as frozen
      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .input('userId', sql.Int, userId)
        .query(`
          UPDATE inventories 
          SET isFrozen = 1, frozenAt = GETDATE(), frozenBy = @userId
          WHERE id = @inventoryId
        `);

      // Note: Categories, companies, locations, and products are now treated as views
      // Only stock and stock_items are frozen for inventory control

      // Freeze stock
      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`
          INSERT INTO inventory_stock_snapshot (inventoryId, stockId, productId, locationId, quantity)
          SELECT @inventoryId, id, productId, locationId, quantity
          FROM stock
        `);

      // Freeze stock items (patrimônio)
      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`
          INSERT INTO inventory_stock_items_snapshot (
            inventoryId, stockItemId, productId, locationId, assetTag, description, 
            category, location, locationCode, costValue, currentValue, condition,
            serialNumber, brand, model, companyId, acquisitionDate, quantity, isActive
          )
          SELECT 
            @inventoryId, s.id, s.productId, s.locationId, p.sku, p.name,
            c.name, l.name, l.code, p.costValue, p.costValue, 
            CASE WHEN s.quantity > 0 THEN 'Bom' ELSE 'Indisponível' END,
            p.sku, '', '', 3, s.createdAt, s.quantity, CASE WHEN s.quantity > 0 THEN 1 ELSE 0 END
          FROM stock s
          LEFT JOIN products p ON s.productId = p.id
          LEFT JOIN categories c ON p.categoryId = c.id  
          LEFT JOIN locations l ON s.locationId = l.id
        `);

      await transaction.commit();

      // Create audit log
      await this.createAuditLog({
        userId: userId,
        entityType: "Inventory",
        entityId: inventoryId.toString(),
        action: "FREEZE",
        oldValues: "",
        newValues: "Inventory data frozen (stock and stock_items only)",
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async unfreezeInventoryData(inventoryId: number, userId: number): Promise<void> {
    const transaction = this.pool.transaction();

    try {
      await transaction.begin();

      // Check if inventory can be unfrozen (no counts should exist)
      const countsCheck = await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`
          SELECT COUNT(*) as countTotal
          FROM inventory_items 
          WHERE inventoryId = @inventoryId 
          AND (count1 IS NOT NULL OR count2 IS NOT NULL OR count3 IS NOT NULL)
        `);

      if (countsCheck.recordset[0].countTotal > 0) {
        throw new Error("Cannot unfreeze inventory with existing counts");
      }

      // Clear snapshot data (only for stock and stock_items)
      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`DELETE FROM inventory_stock_snapshot WHERE inventoryId = @inventoryId`);

      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`DELETE FROM inventory_stock_items_snapshot WHERE inventoryId = @inventoryId`);

      // Mark inventory as not frozen
      await transaction.request()
        .input('inventoryId', sql.Int, inventoryId)
        .query(`
          UPDATE inventories 
          SET isFrozen = 0, frozenAt = NULL, frozenBy = NULL
          WHERE id = @inventoryId
        `);

      await transaction.commit();

      // Create audit log
      await this.createAuditLog({
        userId: userId,
        entityType: "Inventory",
        entityId: inventoryId.toString(),
        action: "UNFREEZE",
        oldValues: "Inventory data frozen",
        newValues: "Inventory data unfrozen (stock and stock_items only)",
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ===== CONTROLE DE PATRIMÔNIO POR NÚMERO DE SÉRIE =====

  // Criar itens de série para inventário
  async createInventorySerialItems(inventoryId: number): Promise<void> {
    console.log(`📋 Creating serial items for inventory ${inventoryId}...`);

    try {
      // First ensure the stored procedure exists
      await this.ensureSerialItemsProcedure();

      const result = await this.pool.request()
        .input('inventoryId', sql.Int, inventoryId)
        .execute('sp_CreateInventorySerialItems');

      console.log(`✅ Created serial items for inventory ${inventoryId}`);
    } catch (error) {
      console.error('❌ Error creating inventory serial items:', error);
      throw error;
    }
  }

  private async ensureSerialItemsProcedure(): Promise<void> {
    try {
      await this.pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateInventorySerialItems')
        BEGIN
          EXEC('
            CREATE PROCEDURE sp_CreateInventorySerialItems
                @InventoryId INT
            AS
            BEGIN
                INSERT INTO inventory_serial_items (
                    inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
                )
                SELECT 
                    @InventoryId,
                    si.id,
                    si.serialNumber,
                    si.productId,
                    si.locationId,
                    1
                FROM stock_items si
                JOIN products p ON si.productId = p.id
                WHERE p.hasSerialControl = 1 
                  AND si.serialNumber IS NOT NULL
                  AND si.serialNumber != ''''
                  AND NOT EXISTS (
                      SELECT 1 FROM inventory_serial_items isi
                      WHERE isi.inventoryId = @InventoryId
                      AND isi.serialNumber = si.serialNumber
                  );

                SELECT @@ROWCOUNT as itemsCreated;
            END
          ')
        END
      `);
    } catch (error) {
      console.warn('⚠️ Could not ensure stored procedure exists:', error);
    }
  }

  // Buscar todos os itens de série de um inventário
  async getInventorySerialItems(inventoryId: number): Promise<InventorySerialItem[]> {
    const result = await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .query(`
        SELECT 
          id, inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus,
          count1_found, count2_found, count3_found, count4_found,
          count1_by, count2_by, count3_by, count4_by,
          count1_at, count2_at, count3_at, count4_at,
          status, notes, finalStatus, createdAt, updatedAt
        FROM inventory_serial_items 
        WHERE inventoryId = @inventoryId
        ORDER BY serialNumber
      `);

    return result.recordset.map(row => ({
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
  async getInventorySerialItemsByProduct(inventoryId: number, productId: number): Promise<InventorySerialItem[]> {
    const result = await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .input('productId', sql.Int, productId)
      .query(`
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

    return result.recordset.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      count1_at: row.count1_at ? new Date(row.count1_at).getTime() : undefined,
      count2_at: row.count2_at ? new Date(row.count2_at).getTime() : undefined,
      count3_at: row.count3_at ? new Date(row.count3_at).getTime() : undefined,
      count4_at: row.count4_at ? new Date(row.count4_at).getTime() : undefined,
    }));
  }

  // Registrar leitura de número de série
  async registerSerialReading(
    inventoryId: number, 
    request: SerialReadingRequest, 
    userId: Number
  ): Promise<SerialReadingResponse> {
    // Verificar se série existe
    const product = await this.findProductBySerial(request.serialNumber);
    if (!product) {
      return { 
        success: false, 
        newSerial: true, 
        message: "Número de série não encontrado no sistema" 
      };
    }

    // Verificar se já foi lida neste estágio
    const existingReading = await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .input('serialNumber', sql.NVarChar, request.serialNumber)
      .query(`
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
        message: "Número de série já foi lido neste estágio" 
      };
    }
    console.log("Usuário: " + userId.toString())
    // Registrar leitura usando stored procedure
    await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .input('serialNumber', sql.NVarChar, request.serialNumber)
      .input('countStage', sql.NVarChar, request.countStage)
      .input('userId', sql.Int, userId)
      .query('EXEC sp_RegisterSerialReading @InventoryId, @SerialNumber, @CountStage, @UserId');

    return { 
      success: true, 
      productId: product.id, 
      productName: product.name,
      message: "Leitura registrada com sucesso"
    };
  }

  // Buscar produto por número de série
  async findProductBySerial(serialNumber: string): Promise<Product | null> {
    const result = await this.pool.request()
      .input('serialNumber', sql.NVarChar, serialNumber)
      .query(`
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
    const result = await this.pool.request()
      .input('serialNumber', sql.NVarChar, serialNumber)
      .query(`
        SELECT COUNT(*) as count FROM stock_items 
        WHERE serialNumber = @serialNumber AND isActive = 1
      `);

    return result.recordset[0].count > 0;
  }

  // Buscar histórico de um número de série
  async getSerialHistory(serialNumber: string): Promise<InventorySerialItem[]> {
    const result = await this.pool.request()
      .input('serialNumber', sql.NVarChar, serialNumber)
      .query(`
        SELECT 
          isi.*, i.code as inventoryCode, i.startDate
        FROM inventory_serial_items isi
        JOIN inventories i ON isi.inventoryId = i.id
        WHERE isi.serialNumber = @serialNumber
        ORDER BY i.startDate DESC
      `);

    return result.recordset.map(row => ({
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
  async updateInventorySerialItem(id: number, data: Partial<InventorySerialItem>): Promise<InventorySerialItem> {
    const updateFields = [];
    const request = this.pool.request().input('id', sql.Int, id);

    if (data.status !== undefined) {
      updateFields.push('status = @status');
      request.input('status', sql.NVarChar, data.status);
    }

    if (data.notes !== undefined) {
      updateFields.push('notes = @notes');
      request.input('notes', sql.NVarChar, data.notes);
    }

    if (data.finalStatus !== undefined) {
      updateFields.push('finalStatus = @finalStatus');
      request.input('finalStatus', sql.Bit, data.finalStatus);
    }

    updateFields.push('updatedAt = GETDATE()');

    await request.query(`
      UPDATE inventory_serial_items 
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `);

    //    // Retornar item atualizado
    const result = await this.pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM inventory_serial_items WHERE id = @id');

    const item = result.recordset[0];
    return {
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      updatedAt: new Date(item.updatedAt).getTime(),
      count1_at: item.count1_at ? new Date(item.count1_at).getTime() : undefined,
      count2_at: item.count2_at ? new Date(item.count2_at).getTime() : undefined,
      count3_at: item.count3_at ? new Date(item.count3_at).getTime() : undefined,
      count4_at: item.count4_at ? new Date(item.count4_at).getTime() : undefined,
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

    await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .query(query);
  }

  // Buscar dados de reconciliação
  async getInventoryReconciliation(inventoryId: number): Promise<any[]> {
    const result = await this.pool.request()
      .input('inventoryId', sql.Int, inventoryId)
      .query(`
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
          ISNULL(c.name, '') as categoryName,
          ISNULL(p.hasSerialControl, 0) as hasSerialControl
        FROM products p
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE p.isActive = 1
        ORDER BY p.name
      `);

      console.log(`✅ Found ${result.recordset.length} products with serial control info`);
      return result.recordset;
    } catch (error) {
      console.error('❌ Error fetching products with serial control:', error);
      throw error;
    }
  }

  async searchProducts(searchTerm: string, limit: number = 10): Promise<any[]> {
    try {
      const request = this.pool.request();
      const searchPattern = `%${searchTerm.toLowerCase()}%`;

      console.log(`Searching products with term: "${searchTerm}"`);

      const result = await request
        .input('searchTerm', searchPattern)
        .input('limit', limit)
        .query(`
          SELECT TOP (@limit)
            p.id,
            p.sku,
            p.name,
            p.description,
            ISNULL(c.name, '') as categoryName,
            0 as hasSerialControl
          FROM products p
          LEFT JOIN categories c ON p.categoryId = c.id
          WHERE (
            LOWER(p.sku) LIKE @searchTerm 
            OR LOWER(p.name) LIKE @searchTerm
            OR LOWER(ISNULL(p.description, '')) LIKE @searchTerm
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

      console.log(`Search for "${searchTerm}" returned ${result.recordset.length} results`);
      return result.recordset;
    } catch (error) {
      console.error('Error searching products:', error);
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

    await this.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
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

    await this.pool.request()
      .input('inventoryId', inventoryId)
      .input('timestamp', Date.now())
      .query(query);
  }

  async createAuditLog(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
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
        .input("timestamp", timestamp)
        .query(`
          INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
          OUTPUT INSERTED.*
          VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, @timestamp)
        `);

      const record = result.recordset[0];
      return {
        ...record,
        timestamp: typeof record.timestamp === 'number' ? record.timestamp : Date.now()
      };
    } catch (error) {
      // Log error but don't throw - audit log shouldn't break main functionality
      console.warn("Warning: Failed to create audit log:", error);
      return null;
    }
  }
}