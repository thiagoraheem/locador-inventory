import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: integer("expire").notNull(),
  },
);

// User storage table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(), // Will store hashed password
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"), // user, admin
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Storage locations table
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Stock association between products and locations
export const stock = sqliteTable("stock", {
  id: integer("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  quantity: real("quantity").default(0),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Inventory types
export const inventoryTypes = sqliteTable("inventory_types", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Inventories
export const inventories = sqliteTable("inventories", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(),
  typeId: integer("type_id").references(() => inventoryTypes.id).notNull(),
  status: text("status").default("OPEN"), // OPEN, COUNTING, CLOSED
  startDate: integer("start_date").notNull(),
  endDate: integer("end_date"),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Inventory items (products to be counted in each inventory)
export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventories.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  expectedQuantity: real("expected_quantity").default(0),
  finalQuantity: real("final_quantity"),
  status: text("status").default("PENDING"), // PENDING, COUNTING, COMPLETED
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

// Counting records (up to 3 counts per inventory item)
export const counts = sqliteTable("counts", {
  id: integer("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  countNumber: integer("count_number").notNull(), // 1, 2, or 3
  quantity: real("quantity").notNull(),
  countedBy: text("counted_by").references(() => users.id).notNull(),
  countedAt: integer("counted_at"),
  notes: text("notes"),
});

// Audit logs
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  metadata: text("metadata"),
  timestamp: integer("timestamp"),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stock: many(stock),
  inventoryItems: many(inventoryItems),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  stock: many(stock),
  inventoryItems: many(inventoryItems),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, {
    fields: [stock.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stock.locationId],
    references: [locations.id],
  }),
}));

export const inventoryTypesRelations = relations(inventoryTypes, ({ many }) => ({
  inventories: many(inventories),
}));

export const inventoriesRelations = relations(inventories, ({ one, many }) => ({
  type: one(inventoryTypes, {
    fields: [inventories.typeId],
    references: [inventoryTypes.id],
  }),
  createdByUser: one(users, {
    fields: [inventories.createdBy],
    references: [users.id],
  }),
  items: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  inventory: one(inventories, {
    fields: [inventoryItems.inventoryId],
    references: [inventories.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [inventoryItems.locationId],
    references: [locations.id],
  }),
  counts: many(counts),
}));

export const countsRelations = relations(counts, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [counts.inventoryItemId],
    references: [inventoryItems.id],
  }),
  countedByUser: one(users, {
    fields: [counts.countedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockSchema = createInsertSchema(stock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryTypeSchema = createInsertSchema(inventoryTypes).omit({
  id: true,
});

export const insertInventorySchema = createInsertSchema(inventories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountSchema = createInsertSchema(counts).omit({
  id: true,
  countedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stock.$inferSelect;

export type InsertInventoryType = z.infer<typeof insertInventoryTypeSchema>;
export type InventoryType = typeof inventoryTypes.$inferSelect;

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventories.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export type InsertCount = z.infer<typeof insertCountSchema>;
export type Count = typeof counts.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;