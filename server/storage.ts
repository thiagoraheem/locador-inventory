import {
  users,
  products,
  locations,
  stock,
  inventoryTypes,
  inventories,
  inventoryItems,
  counts,
  auditLogs,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
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
import { db } from "./db";
import { eq, desc, like, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Product operations
  async getProducts(search?: string, limit = 50, offset = 0, includeInactive = false): Promise<Product[]> {
    let query = db.select().from(products);
    
    if (search) {
      if (includeInactive) {
        query = query.where(like(products.name, `%${search}%`));
      } else {
        query = query.where(
          and(
            like(products.name, `%${search}%`),
            eq(products.isActive, true)
          )
        );
      }
    } else {
      if (!includeInactive) {
        query = query.where(eq(products.isActive, true));
      }
    }
    
    return query.limit(limit).offset(offset).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  }

  // Location operations
  async getLocations(search?: string): Promise<Location[]> {
    let query = db.select().from(locations).where(eq(locations.isActive, true));
    
    if (search) {
      query = query.where(
        and(
          like(locations.name, `%${search}%`),
          eq(locations.isActive, true)
        )
      );
    }
    
    return query.orderBy(locations.name);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<void> {
    await db.update(locations).set({ isActive: false }).where(eq(locations.id, id));
  }

  // Stock operations
  async getStock(productId?: number, locationId?: number): Promise<(Stock & { product: Product; location: Location })[]> {
    let query = db
      .select()
      .from(stock)
      .leftJoin(products, eq(stock.productId, products.id))
      .leftJoin(locations, eq(stock.locationId, locations.id));

    const conditions = [];
    if (productId) conditions.push(eq(stock.productId, productId));
    if (locationId) conditions.push(eq(stock.locationId, locationId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    return results.map(result => ({
      ...result.stock,
      product: result.products!,
      location: result.locations!,
    }));
  }

  async getStockItem(id: number): Promise<Stock | undefined> {
    const [stockItem] = await db.select().from(stock).where(eq(stock.id, id));
    return stockItem;
  }

  async createStock(stockData: InsertStock): Promise<Stock> {
    const [newStock] = await db.insert(stock).values(stockData).returning();
    return newStock;
  }

  async updateStock(id: number, stockData: Partial<InsertStock>): Promise<Stock> {
    const [updatedStock] = await db
      .update(stock)
      .set({ ...stockData, updatedAt: new Date() })
      .where(eq(stock.id, id))
      .returning();
    return updatedStock;
  }

  async deleteStock(id: number): Promise<void> {
    await db.delete(stock).where(eq(stock.id, id));
  }

  // Inventory type operations
  async getInventoryTypes(): Promise<InventoryType[]> {
    return db.select().from(inventoryTypes).where(eq(inventoryTypes.isActive, true));
  }

  async createInventoryType(type: InsertInventoryType): Promise<InventoryType> {
    const [newType] = await db.insert(inventoryTypes).values(type).returning();
    return newType;
  }

  // Inventory operations
  async getInventories(status?: string): Promise<(Inventory & { type: InventoryType; createdByUser: User })[]> {
    let query = db
      .select()
      .from(inventories)
      .leftJoin(inventoryTypes, eq(inventories.typeId, inventoryTypes.id))
      .leftJoin(users, eq(inventories.createdBy, users.id));

    if (status) {
      query = query.where(eq(inventories.status, status));
    }

    const results = await query.orderBy(desc(inventories.createdAt));
    return results.map(result => ({
      ...result.inventories,
      type: result.inventory_types!,
      createdByUser: result.users!,
    }));
  }

  async getInventory(id: number): Promise<(Inventory & { type: InventoryType; createdByUser: User }) | undefined> {
    const [result] = await db
      .select()
      .from(inventories)
      .leftJoin(inventoryTypes, eq(inventories.typeId, inventoryTypes.id))
      .leftJoin(users, eq(inventories.createdBy, users.id))
      .where(eq(inventories.id, id));

    if (!result) return undefined;

    return {
      ...result.inventories,
      type: result.inventory_types!,
      createdByUser: result.users!,
    };
  }

  async createInventory(inventory: InsertInventory): Promise<Inventory> {
    // Generate unique code if not provided
    let inventoryData = { ...inventory };
    if (!inventoryData.code) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const count = await db.select({ count: sql<number>`count(*)` })
        .from(inventories)
        .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month}`);
      
      const nextNumber = (count[0]?.count || 0) + 1;
      inventoryData.code = `INV-${year}${month}-${String(nextNumber).padStart(3, '0')}`;
    }
    
    const [newInventory] = await db.insert(inventories).values(inventoryData).returning();
    return newInventory;
  }

  async updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory> {
    const [updatedInventory] = await db
      .update(inventories)
      .set({ ...inventory, updatedAt: new Date() })
      .where(eq(inventories.id, id))
      .returning();
    return updatedInventory;
  }

  async closeInventory(id: number): Promise<void> {
    // Get all inventory items with their final quantities
    const items = await db
      .select({
        inventoryItem: inventoryItems,
        product: products,
        location: locations,
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(locations, eq(inventoryItems.locationId, locations.id))
      .where(eq(inventoryItems.inventoryId, id));

    // Update stock quantities based on final count results
    for (const item of items) {
      if (item.inventoryItem.finalQuantity !== null) {
        // Find existing stock record
        const [existingStock] = await db
          .select()
          .from(stock)
          .where(
            and(
              eq(stock.productId, item.inventoryItem.productId),
              eq(stock.locationId, item.inventoryItem.locationId)
            )
          );

        if (existingStock) {
          // Update existing stock
          await db
            .update(stock)
            .set({ 
              quantity: item.inventoryItem.finalQuantity.toString(),
              updatedAt: new Date()
            })
            .where(eq(stock.id, existingStock.id));
        } else {
          // Create new stock record
          await db.insert(stock).values({
            productId: item.inventoryItem.productId,
            locationId: item.inventoryItem.locationId,
            quantity: item.inventoryItem.finalQuantity.toString(),
          });
        }
      }
    }

    // Update inventory status to CLOSED
    await db
      .update(inventories)
      .set({ 
        status: 'CLOSED',
        endDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(inventories.id, id));
  }

  // Inventory item operations
  async getInventoryItems(inventoryId: number): Promise<(InventoryItem & { product: Product; location: Location })[]> {
    const results = await db
      .select()
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(locations, eq(inventoryItems.locationId, locations.id))
      .where(eq(inventoryItems.inventoryId, inventoryId));

    return results.map(result => ({
      ...result.inventory_items,
      product: result.products!,
      location: result.locations!,
    }));
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  // Count operations
  async getCounts(inventoryItemId: number): Promise<(Count & { countedByUser: User })[]> {
    const results = await db
      .select()
      .from(counts)
      .leftJoin(users, eq(counts.countedBy, users.id))
      .where(eq(counts.inventoryItemId, inventoryItemId))
      .orderBy(counts.countNumber);

    return results.map(result => ({
      ...result.counts,
      countedByUser: result.users!,
    }));
  }

  async createCount(count: InsertCount): Promise<Count> {
    const [newCount] = await db.insert(counts).values(count).returning();
    return newCount;
  }

  // Audit log operations
  async getAuditLogs(limit = 50, offset = 0): Promise<(AuditLog & { user: User })[]> {
    const results = await db
      .select()
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return results.map(result => ({
      ...result.audit_logs,
      user: result.users!,
    }));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalProducts: number;
    activeInventories: number;
    stockLocations: number;
    lastAuditDays: number;
  }> {
    const [productCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));

    const [inventoryCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventories)
      .where(eq(inventories.status, 'OPEN'));

    const [locationCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(eq(locations.isActive, true));

    const [lastAudit] = await db
      .select({ timestamp: auditLogs.timestamp })
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(1);

    const lastAuditDays = lastAudit && lastAudit.timestamp
      ? Math.floor((Date.now() - lastAudit.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalProducts: productCount.count,
      activeInventories: inventoryCount.count,
      stockLocations: locationCount.count,
      lastAuditDays,
    };
  }
}

export const storage = new DatabaseStorage();
