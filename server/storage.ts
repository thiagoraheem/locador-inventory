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

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  upsertUser(user: InsertUser & { id: string }): Promise<User>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Product operations
  getProducts(search?: string, limit?: number, offset?: number, includeInactive?: boolean): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Location operations
  getLocations(search?: string): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // Stock operations
  getStock(productId?: number, locationId?: number): Promise<(Stock & { product: Product; location: Location })[]>;
  getStockItem(id: number): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(id: number, stock: Partial<InsertStock>): Promise<Stock>;
  deleteStock(id: number): Promise<void>;

  // Inventory type operations
  getInventoryTypes(): Promise<InventoryType[]>;
  createInventoryType(type: InsertInventoryType): Promise<InventoryType>;

  // Inventory operations
  getInventories(status?: string): Promise<(Inventory & { type: InventoryType; createdByUser: User })[]>;
  getInventory(id: number): Promise<(Inventory & { type: InventoryType; createdByUser: User }) | undefined>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory>;
  closeInventory(id: number): Promise<void>;

  // Inventory item operations
  getInventoryItems(inventoryId: number): Promise<(InventoryItem & { product: Product; location: Location })[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;

  // Count operations
  getCounts(inventoryItemId: number): Promise<(Count & { countedByUser: User })[]>;
  createCount(count: InsertCount): Promise<Count>;

  // Audit log operations
  getAuditLogs(limit?: number, offset?: number): Promise<(AuditLog & { user: User })[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalProducts: number;
    activeInventories: number;
    stockLocations: number;
    lastAuditDays: number;
  }>;
}

// In-memory storage implementation (kept for fallback/testing)
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private products: Map<number, Product> = new Map();
  private locations: Map<number, Location> = new Map();
  private stock: Map<number, Stock & { product: Product; location: Location }> = new Map();
  private inventoryTypes: Map<number, InventoryType> = new Map();
  private inventories: Map<number, Inventory & { type: InventoryType; createdByUser: User }> = new Map();
  private inventoryItems: Map<number, InventoryItem & { product: Product; location: Location }> = new Map();
  private counts: Map<number, Count & { countedByUser: User }> = new Map();
  private auditLogs: Map<number, AuditLog & { user: User }> = new Map();

  private nextId = {
    category: 1,
    product: 1,
    location: 1,
    stock: 1,
    inventoryType: 1,
    inventory: 1,
    inventoryItem: 1,
    count: 1,
    auditLog: 1,
  };

  private seeded = false;

  constructor() {
    this.seedInitialData();
  }

  private async ensureSeeded() {
    if (!this.seeded) {
      await this.seedInitialData();
      this.seeded = true;
    }
  }

  private async seedInitialData() {
    if (this.seeded) return;

    // Seed with some initial data for testing  
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash("password", 12);

    const defaultUser: User = {
      id: "user1",
      email: "admin@example.com",
      username: "admin",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Seed inventory types
    const inventoryType: InventoryType = {
      id: this.nextId.inventoryType++,
      name: "Periodic Count",
      description: "Regular inventory count",
      isActive: true,
    };
    this.inventoryTypes.set(inventoryType.id, inventoryType);

    // Seed categories
    const category: Category = {
      id: this.nextId.category++,
      name: "General",
      description: "General category",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.categories.set(category.id, category);

    // Seed locations
    const location: Location = {
      id: this.nextId.location++,
      code: "WH001",
      name: "Main Warehouse",
      description: "Main storage location",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.locations.set(location.id, location);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureSeeded();
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}`,
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) throw new Error("User not found");

    const updatedUser = {
      ...existingUser,
      ...userData,
      updatedAt: Date.now(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async upsertUser(userData: InsertUser & { id: string }): Promise<User> {
    const existingUser = this.users.get(userData.id);
    if (existingUser) {
      return this.updateUser(userData.id, userData);
    } else {
      const user: User = {
        ...userData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.users.set(user.id, user);
      return user;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.isActive);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const category: Category = {
      id: this.nextId.category++,
      ...categoryData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.categories.set(category.id, category);
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category> {
    const existing = this.categories.get(id);
    if (!existing) throw new Error("Category not found");

    const updated = {
      ...existing,
      ...categoryData,
      updatedAt: Date.now(),
    };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    const existing = this.categories.get(id);
    if (existing) {
      this.categories.set(id, { ...existing, isActive: false });
    }
  }

  // Product operations
  async getProducts(search?: string, limit = 50, offset = 0, includeInactive = false): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (!includeInactive) {
      products = products.filter(p => p.isActive);
    }

    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      );
    }

    return products
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit)
      .map(product => {
        const category = product.categoryId ? this.categories.get(product.categoryId) : undefined;
        return {
          ...product,
          category: category ? { id: category.id, name: category.name } : undefined,
        };
      });
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const product: Product = {
      id: this.nextId.product++,
      ...productData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.products.set(product.id, product);
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error("Product not found");

    const updated = {
      ...existing,
      ...productData,
      updatedAt: Date.now(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    const existing = this.products.get(id);
    if (existing) {
      this.products.set(id, { ...existing, isActive: false });
    }
  }

  // Location operations
  async getLocations(search?: string): Promise<Location[]> {
    let locations = Array.from(this.locations.values()).filter(loc => loc.isActive);

    if (search) {
      locations = locations.filter(loc => 
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    return locations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    const location: Location = {
      id: this.nextId.location++,
      ...locationData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.locations.set(location.id, location);
    return location;
  }

  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location> {
    const existing = this.locations.get(id);
    if (!existing) throw new Error("Location not found");

    const updated = {
      ...existing,
      ...locationData,
      updatedAt: Date.now(),
    };
    this.locations.set(id, updated);
    return updated;
  }

  async deleteLocation(id: number): Promise<void> {
    const existing = this.locations.get(id);
    if (existing) {
      this.locations.set(id, { ...existing, isActive: false });
    }
  }

  // Stock operations
  async getStock(productId?: number, locationId?: number): Promise<(Stock & { product: Product; location: Location })[]> {
    let stockItems = Array.from(this.stock.values());

    if (productId) {
      stockItems = stockItems.filter(item => item.productId === productId);
    }

    if (locationId) {
      stockItems = stockItems.filter(item => item.locationId === locationId);
    }

    return stockItems;
  }

  async getStockItem(id: number): Promise<Stock | undefined> {
    const item = this.stock.get(id);
    return item ? {
      id: item.id,
      productId: item.productId,
      locationId: item.locationId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : undefined;
  }

  async createStock(stockData: InsertStock): Promise<Stock> {
    const product = this.products.get(stockData.productId);
    const location = this.locations.get(stockData.locationId);

    if (!product || !location) {
      throw new Error("Product or location not found");
    }

    const stock: Stock = {
      id: this.nextId.stock++,
      ...stockData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.stock.set(stock.id, {
      ...stock,
      product,
      location,
    });

    return stock;
  }

  async updateStock(id: number, stockData: Partial<InsertStock>): Promise<Stock> {
    const existing = this.stock.get(id);
    if (!existing) throw new Error("Stock not found");

    const updated = {
      ...existing,
      ...stockData,
      updatedAt: Date.now(),
    };
    this.stock.set(id, updated);
    return {
      id: updated.id,
      productId: updated.productId,
      locationId: updated.locationId,
      quantity: updated.quantity,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteStock(id: number): Promise<void> {
    this.stock.delete(id);
  }

  // Inventory type operations
  async getInventoryTypes(): Promise<InventoryType[]> {
    return Array.from(this.inventoryTypes.values()).filter(type => type.isActive);
  }

  async createInventoryType(typeData: InsertInventoryType): Promise<InventoryType> {
    const type: InventoryType = {
      id: this.nextId.inventoryType++,
      ...typeData,
    };
    this.inventoryTypes.set(type.id, type);
    return type;
  }

  // Inventory operations
  async getInventories(status?: string): Promise<(Inventory & { type: InventoryType; createdByUser: User })[]> {
    let inventories = Array.from(this.inventories.values());

    if (status) {
      inventories = inventories.filter(inv => inv.status === status);
    }

    return inventories.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getInventory(id: number): Promise<(Inventory & { type: InventoryType; createdByUser: User }) | undefined> {
    return this.inventories.get(id);
  }

  async createInventory(inventoryData: InsertInventory): Promise<Inventory> {
    const type = this.inventoryTypes.get(inventoryData.typeId);
    const user = this.users.get(inventoryData.createdBy);

    if (!type || !user) {
      throw new Error("Inventory type or user not found");
    }

    // Generate unique code if not provided
    let code = inventoryData.code;
    if (!code) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const count = Array.from(this.inventories.values()).length;
      code = `INV-${year}${month}-${String(count + 1).padStart(3, '0')}`;
    }

    const inventory: Inventory = {
      id: this.nextId.inventory++,
      ...inventoryData,
      code,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.inventories.set(inventory.id, {
      ...inventory,
      type,
      createdByUser: user,
    });

    // Auto-create inventory items for all active products in all active locations
    const activeProducts = Array.from(this.products.values()).filter(p => p.isActive);
    const activeLocations = Array.from(this.locations.values()).filter(l => l.isActive);

    for (const product of activeProducts) {
      for (const location of activeLocations) {
        // Find existing stock for this product-location combination
        const stockItem = Array.from(this.stock.values()).find(
          s => s.productId === product.id && s.locationId === location.id
        );

        const expectedQuantity = stockItem ? stockItem.quantity : 0;

        const itemId = this.nextId.inventoryItem++;
        this.inventoryItems.set(itemId, {
          id: itemId,
          inventoryId: inventory.id,
          productId: product.id,
          locationId: location.id,
          expectedQuantity: expectedQuantity,
          finalQuantity: undefined,
          status: "PENDING",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          product: product,
          location: location,
        });
      }
    }

    return inventory;
  }

  async updateInventory(id: number, inventoryData: Partial<InsertInventory>): Promise<Inventory> {
    const existing = this.inventories.get(id);
    if (!existing) throw new Error("Inventory not found");

    const updated = {
      ...existing,
      ...inventoryData,
      updatedAt: Date.now(),
    };
    this.inventories.set(id, updated);
    return {
      id: updated.id,
      code: updated.code,
      typeId: updated.typeId,
      status: updated.status,
      startDate: updated.startDate,
      endDate: updated.endDate,
      description: updated.description,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async closeInventory(id: number): Promise<void> {
    const inventory = this.inventories.get(id);
    if (!inventory) throw new Error("Inventory not found");

    // Update stock based on final quantities
    const items = Array.from(this.inventoryItems.values()).filter(item => item.inventoryId === id);

    for (const item of items) {
      if (item.finalQuantity !== undefined) {
        const stockItems = Array.from(this.stock.values()).filter(
          stock => stock.productId === item.productId && stock.locationId === item.locationId
        );

        if (stockItems.length > 0) {
          const stockItem = stockItems[0];
          this.stock.set(stockItem.id, {
            ...stockItem,
            quantity: item.finalQuantity,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Update inventory status
    this.inventories.set(id, {
      ...inventory,
      status: 'CLOSED',
      endDate: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // Inventory item operations
  async getInventoryItems(inventoryId: number): Promise<(InventoryItem & { product: Product; location: Location })[]> {
    return Array.from(this.inventoryItems.values()).filter(item => item.inventoryId === inventoryId);
  }

  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    const product = this.products.get(itemData.productId);
    const location = this.locations.get(itemData.locationId);

    if (!product || !location) {
      throw new Error("Product or location not found");
    }

    const item: InventoryItem = {
      id: this.nextId.inventoryItem++,
      ...itemData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.inventoryItems.set(item.id, {
      ...item,
      product,
      location,
    });

    return item;
  }

  async updateInventoryItem(id: number, itemData: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const existing = this.inventoryItems.get(id);
    if (!existing) throw new Error("Inventory item not found");

    const updated = {
      ...existing,
      ...itemData,
      updatedAt: Date.now(),
    };
    this.inventoryItems.set(id, updated);
    return {
      id: updated.id,
      inventoryId: updated.inventoryId,
      productId: updated.productId,
      locationId: updated.locationId,
      expectedQuantity: updated.expectedQuantity,
      finalQuantity: updated.finalQuantity,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // Count operations
  async getCounts(inventoryItemId: number): Promise<(Count & { countedByUser: User })[]> {
    return Array.from(this.counts.values())
      .filter(count => count.inventoryItemId === inventoryItemId)
      .sort((a, b) => a.countNumber - b.countNumber);
  }

  async createCount(countData: InsertCount): Promise<Count> {
    const user = this.users.get(countData.countedBy);
    if (!user) throw new Error("User not found");

    const count: Count = {
      id: this.nextId.count++,
      ...countData,
      countedAt: Date.now(),
    };

    this.counts.set(count.id, {
      ...count,
      countedByUser: user,
    });

    // Get all counts for this inventory item to calculate final quantity
    const allCounts = Array.from(this.counts.values()).filter(c => c.inventoryItemId === countData.inventoryItemId);

    let status = 'COUNTING';
    let finalQuantity: number | undefined = undefined;

    if (allCounts.length >= 2) {
      // Calculate final quantity based on count logic
      const quantities = allCounts.map(count => count.quantity);

      if (allCounts.length === 2) {
        // Check if first two counts match
        if (Math.abs(quantities[0] - quantities[1]) <= 0.01) {
          finalQuantity = quantities[0];
          status = 'COMPLETED';
        }
      } else if (allCounts.length === 3) {
        // Use median of three counts
        const sortedQuantities = [...quantities].sort((a, b) => a - b);
        finalQuantity = sortedQuantities[1];
        status = 'COMPLETED';
      }
    }

    // Update inventory item with status and final quantity
    const item = this.inventoryItems.get(countData.inventoryItemId);
    if (item) {
      this.inventoryItems.set(item.id, {
        ...item,
        status: status,
        finalQuantity: finalQuantity,
        updatedAt: Date.now(),
      });
    }

    return count;
  }

  // Audit log operations
  async getAuditLogs(limit = 50, offset = 0): Promise<(AuditLog & { user: User })[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const user = this.users.get(logData.userId);
    if (!user) throw new Error("User not found");

    const log: AuditLog = {
      id: this.nextId.auditLog++,
      ...logData,
      timestamp: Date.now(),
    };

    this.auditLogs.set(log.id, {
      ...log,
      user,
    });

    return log;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalProducts: number;
    activeInventories: number;
    stockLocations: number;
    lastAuditDays: number;
  }> {
    const totalProducts = Array.from(this.products.values()).filter(p => p.isActive).length;
    const activeInventories = Array.from(this.inventories.values()).filter(inv => inv.status === 'OPEN').length;
    const stockLocations = Array.from(this.locations.values()).filter(loc => loc.isActive).length;

    const auditLogs = Array.from(this.auditLogs.values());
    const lastAudit = auditLogs.length > 0 
      ? auditLogs.reduce((latest, log) => log.timestamp > latest.timestamp ? log : latest)
      : null;

    const lastAuditDays = lastAudit 
      ? Math.floor((Date.now() - lastAudit.timestamp) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalProducts,
      activeInventories,
      stockLocations,
      lastAuditDays,
    };
  }
}

export const storage = new MemStorage();