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

export interface Inventory {
  id: number;
  code: string;
  typeId: number;
  status: string;
  startDate: number;
  endDate?: number;
  description?: string;
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

export const insertInventorySchema = z.object({
  code: z.string().optional(),
  typeId: z.number(),
  status: z.string().default("OPEN"),
  startDate: z.number(),
  endDate: z.number().optional(),
  description: z.string().optional(),
  createdBy: z.string(),
});

export const insertInventoryItemSchema = z.object({
  inventoryId: z.number(),
  productId: z.number(),
  locationId: z.number(),
  expectedQuantity: z.number().default(0),
  finalQuantity: z.number().optional(),
  status: z.string().default("PENDING"),
});

export const insertCountSchema = z.object({
  inventoryItemId: z.number(),
  countNumber: z.number(),
  quantity: z.number(),
  countedBy: z.string(),
  notes: z.string().optional(),
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