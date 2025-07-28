import { z } from "zod";

// Types based on SQL Server database structure
export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  categoryId?: number;
  costValue?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Stock {
  id: number;
  productId: number;
  locationId: number;
  quantity: number;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

// Inventory status enum - expanded for multi-stage counting process
export type InventoryStatus = 
  | "planning"      // Planejamento inicial
  | "open"         // Aberto para contagem
  | "count1"       // 1ª contagem em andamento
  | "count2"       // 2ª contagem em andamento
  | "count3"       // 3ª contagem em andamento
  | "audit"        // Em auditoria
  | "divergence"   // Divergência identificada
  | "closed"       // Fechado/Concluído
  | "cancelled";   // Cancelado

export interface Inventory {
  id: number;
  code: string;
  typeId: number;
  status: InventoryStatus;
  startDate: number;
  endDate?: number;
  predictedEndDate?: number;
  description?: string;
  selectedLocationIds?: number[];  // JSON array of selected location IDs
  selectedCategoryIds?: number[];  // JSON array of selected category IDs
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItem {
  id: number;
  inventoryId: number;
  productId: number;
  locationId: number;
  expectedQuantity: number;
  finalQuantity?: number;
  status: string;
  // Multiple count fields
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  difference?: number;
  accuracy?: number;
  // Count audit fields
  count1By?: string;
  count2By?: string;
  count3By?: string;
  count4By?: string;
  count1At?: number;
  count2At?: number;
  count3At?: number;
  count4At?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Count {
  id: number;
  inventoryItemId: number;
  countNumber: number;
  quantity: number;
  countedBy: string;
  countedAt: number;
  notes?: string;
}

export interface AuditLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string;
  newValues?: string;
  metadata?: string;
  timestamp: number;
}

// New interface for stock item inventory control
export interface InventoryStockItem {
  id: number;
  inventoryId: number;
  stockItemId: number;
  expectedQuantity: number;
  finalQuantity?: number;
  status: string;
  // Multiple count fields
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  difference?: number;
  accuracy?: number;
  // Count audit fields
  count1By?: string;
  count2By?: string;
  count3By?: string;
  count4By?: string;
  count1At?: number;
  count2At?: number;
  count3At?: number;
  count4At?: number;
  createdAt: number;
  updatedAt: number;
}

// Control Panel Statistics interface
export interface ControlPanelStats {
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
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().default("user"),
  isActive: z.boolean().default(true),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  costValue: z.number().optional(),
  isActive: z.boolean().default(true),
});

export const insertLocationSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertStockSchema = z.object({
  productId: z.number(),
  locationId: z.number(),
  quantity: z.number().default(0),
});

export const insertInventoryTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Inventory status validation
export const inventoryStatusSchema = z.enum([
  "planning", "open", "count1", "count2", "count3", 
  "audit", "divergence", "closed", "cancelled"
]);

export const insertInventorySchema = z.object({
  code: z.string().optional(),
  typeId: z.number(),
  status: inventoryStatusSchema.default("planning"),
  startDate: z.number(),
  endDate: z.number().nullable().optional(),
  predictedEndDate: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  selectedLocationIds: z.array(z.number()).optional(),
  selectedCategoryIds: z.array(z.number()).optional(),
  createdBy: z.string(),
});

export const insertInventoryItemSchema = z.object({
  inventoryId: z.number(),
  productId: z.number(),
  locationId: z.number(),
  expectedQuantity: z.number().default(0),
  finalQuantity: z.number().optional(),
  status: z.string().default("PENDING"),
  // Count fields validation
  count1: z.number().optional(),
  count2: z.number().optional(),
  count3: z.number().optional(),
  count4: z.number().optional(),
  difference: z.number().optional(),
  accuracy: z.number().min(0).max(100).optional(),
  // Count audit fields
  count1By: z.string().optional(),
  count2By: z.string().optional(),
  count3By: z.string().optional(),
  count4By: z.string().optional(),
  count1At: z.number().optional(),
  count2At: z.number().optional(),
  count3At: z.number().optional(),
  count4At: z.number().optional(),
});

export const insertCountSchema = z.object({
  inventoryItemId: z.number(),
  countNumber: z.number(),
  quantity: z.number(),
  countedBy: z.string(),
  notes: z.string().optional(),
});

// New schema for stock item inventory control
export const insertInventoryStockItemSchema = z.object({
  inventoryId: z.number(),
  stockItemId: z.number(),
  expectedQuantity: z.number().default(0),
  finalQuantity: z.number().optional(),
  status: z.string().default("PENDING"),
  // Count fields validation
  count1: z.number().optional(),
  count2: z.number().optional(),
  count3: z.number().optional(),
  count4: z.number().optional(),
  difference: z.number().optional(),
  accuracy: z.number().min(0).max(100).optional(),
  // Count audit fields
  count1By: z.string().optional(),
  count2By: z.string().optional(),
  count3By: z.string().optional(),
  count4By: z.string().optional(),
  count1At: z.number().optional(),
  count2At: z.number().optional(),
  count3At: z.number().optional(),
  count4At: z.number().optional(),
});

export const insertAuditLogSchema = z.object({
  userId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  oldValues: z.string().optional(),
  newValues: z.string().optional(),
  metadata: z.string().optional(),
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

// Type inference from Zod schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type InsertInventoryType = z.infer<typeof insertInventoryTypeSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InsertCount = z.infer<typeof insertCountSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type InsertInventoryStockItem = z.infer<typeof insertInventoryStockItemSchema>;

// Additional types
export type AuditLogWithDetails = AuditLog & {
  user?: User;
};

// Company and StockItem interfaces for the existing SQL Server views
export interface Company {
  id: number;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StockItem {
  id: number;
  productId?: number;
  locationId?: number;
  quantity?: number;
  assetTag: string;
  description: string;
  category?: string;
  location?: string;
  locationCode?: string;
  companyId?: number;
  acquisitionDate?: number;
  costValue?: number;
  currentValue?: number;
  condition?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export const insertCompanySchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().default(true),
});

export const insertStockItemSchema = z.object({
  assetTag: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
  companyId: z.number().optional(),
  acquisitionDate: z.number().optional(),
  costValue: z.number().optional(),
  currentValue: z.number().optional(),
  condition: z.string().default("Bom"),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;