import { z } from "zod";

// Types based on SQL Server database structure
export interface User {
  id: number;
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
  | "planning"         // Planejamento inicial
  | "open"            // Aberto para contagem
  | "count1_open"     // 1ª contagem aberta
  | "count1_closed"   // 1ª contagem fechada
  | "count2_open"     // 2ª contagem aberta
  | "count2_closed"   // 2ª contagem fechada
  | "count2_completed" // 2ª contagem concluída (C1=C2)
  | "count3_required" // 3ª contagem necessária (C1≠C2)
  | "count3_open"     // 3ª contagem aberta
  | "count3_closed"   // 3ª contagem fechada
  | "audit_mode"      // Modo auditoria (Mesa de Controle)
  | "closed"          // Fechado/Concluído
  | "cancelled";      // Cancelado

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
  createdBy: number;
  createdAt: number;
  updatedAt: number;
  isToBlockSystem?: boolean;  // Field to block stock movement
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
  count1By?: number;
  count2By?: number;
  count3By?: number;
  count4By?: number;  
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
  countedBy: number;
  countedAt: number;
  notes?: string;
}

export interface AuditLog {
  id: number;
  userId: number;
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
  count1By?: number;
  count2By?: number;
  count3By?: number;
  count4By?: number;
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
  totalDifference: number;
  accuracyItems: number;
  divergentItems: number;
  financialImpact?: number;
  countingProgress: {
    count1: number;
    count2: number;
    count3: number;
    audit: number;
  };
}

// Final Report interface for comprehensive inventory summary
export interface InventoryFinalReport {
  inventoryId: number;
  inventoryName: string;
  status: string;
  startDate: number;
  endDate?: number;
  totalItems: number;
  completedItems: number;
  accuracy: {
    totalItems: number;
    accurateItems: number;
    divergentItems: number;
    accuracyRate: number;
  };
  differences: {
    totalDifference: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
    adjustmentCount: number;
  };
  financial: {
    totalValue: number;
    differenceValue: number;
    impactPercentage: number;
  };
  countingSummary: {
    count1Items: number;
    count2Items: number;
    count3Items: number;
    auditItems: number;
  };
  divergentItems: Array<{
    id: number;
    productName: string;
    productSku: string;
    locationName: string;
    expectedQuantity: number;
    finalQuantity: number;
    difference: number;
    costValue?: number;
    totalImpact?: number;
  }>;
  recommendations: string[];
}

// Controle de Patrimônio - Número de Série
export interface InventorySerialItem {
  id: number;
  inventoryId: number;
  stockItemId: number;
  serialNumber: string;
  productId: number;
  locationId: number;
  expectedStatus: boolean;
  
  // Contagens por estágio
  count1_found?: boolean;
  count2_found?: boolean;
  count3_found?: boolean;
  count4_found?: boolean;
  
  // Auditoria
  count1_by?: string;
  count2_by?: string;
  count3_by?: string;
  count4_by?: string;
  count1_at?: number;
  count2_at?: number;
  count3_at?: number;
  count4_at?: number;
  
  status: 'PENDING' | 'FOUND' | 'MISSING' | 'EXTRA';
  notes?: string;
  finalStatus?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProductWithSerialControl extends Product {
  hasSerialControl: boolean;
  serialItemsCount?: number;
}

export interface InventoryItemWithSerial extends InventoryItem {
  serialItemsCount: number;
  serialItemsFound: number;
  serialItemsMissing: number;
  hasSerialDiscrepancy: boolean;
}

export interface SerialReadingRequest {
  serialNumber: string;
  countStage: 'count1' | 'count2' | 'count3' | 'count4';
}

export interface SerialReadingResponse {
  success: boolean;
  productId?: number;
  productName?: string;
  alreadyRead?: boolean;
  newSerial?: boolean;
  message?: string;
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
  "planning", "open", "count1_open", "count1_closed", "count2_open", "count2_closed", 
  "count3_open", "count3_closed", "audit", "divergence", "closed", "cancelled"
]);

export const insertInventorySchema = z.object({
  code: z.string().optional(),
  typeId: z.number(),
  status: inventoryStatusSchema.default("planning"),
  startDate: z.number(),
  endDate: z.number().nullable().optional(),
  predictedEndDate: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  isToBlockSystem: z.boolean().optional().default(false),
  selectedLocationIds: z.array(z.number()).optional(),
  selectedCategoryIds: z.array(z.number()).optional(),
  createdBy: z.number(),
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
  count1By: z.number().optional(),
  count2By: z.number().optional(),
  count3By: z.number().optional(),
  count4By: z.number().optional(),
  count1At: z.number().optional(),
  count2At: z.number().optional(),
  count3At: z.number().optional(),
  count4At: z.number().optional(),
});

export const insertCountSchema = z.object({
  inventoryItemId: z.number(),
  countNumber: z.number(),
  quantity: z.number(),
  countedBy: z.number(),
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
  count1By: z.number().optional(),
  count2By: z.number().optional(),
  count3By: z.number().optional(),
  count4By: z.number().optional(),
  count1At: z.number().optional(),
  count2At: z.number().optional(),
  count3At: z.number().optional(),
  count4At: z.number().optional(),
});

export const insertAuditLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  oldValues: z.string().optional(),
  newValues: z.string().optional(),
  metadata: z.string().optional(),
});

// Serial Reading schemas
export const serialReadingRequestSchema = z.object({
  serialNumber: z.string().min(1),
  countStage: z.enum(['count1', 'count2', 'count3', 'count4']),
});

export const serialReadingResponseSchema = z.object({
  success: z.boolean(),
  productId: z.number().optional(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  alreadyRead: z.boolean().optional(),
  newSerial: z.boolean().optional(),
  message: z.string().optional(),
});

// Reconciliation schemas
export const reconciliationReportSchema = z.object({
  inventoryId: z.number(),
  summary: z.object({
    totalProducts: z.number(),
    productsWithSerial: z.number(),
    productsManual: z.number(),
    serialItemsExpected: z.number(),
    serialItemsFound: z.number(),
    serialItemsMissing: z.number(),
    productsWithDiscrepancy: z.number(),
  }),
  productDetails: z.array(z.any()),
  serialDiscrepancies: z.array(z.any()),
  recommendations: z.array(z.string()),
});

// Validation schemas
export const validationReportSchema = z.object({
  inventoryId: z.number(),
  isValid: z.boolean(),
  issues: z.array(z.object({
    type: z.string(),
    productId: z.number().optional(),
    serialNumber: z.string().optional(),
    expected: z.number().optional(),
    found: z.number().optional(),
    count: z.number().optional(),
    manualQuantity: z.number().optional(),
    serialQuantity: z.number().optional(),
  })),
  timestamp: z.number(),
});

// Schema para controle de patrimônio por número de série
export const insertInventorySerialItemSchema = z.object({
  inventoryId: z.number(),
  stockItemId: z.number(),
  serialNumber: z.string().min(1),
  productId: z.number(),
  locationId: z.number(),
  expectedStatus: z.boolean().default(true),
  
  // Contagens por estágio
  count1_found: z.boolean().optional(),
  count2_found: z.boolean().optional(),
  count3_found: z.boolean().optional(),
  count4_found: z.boolean().optional(),
  
  // Auditoria
  count1_by: z.string().optional(),
  count2_by: z.string().optional(),
  count3_by: z.string().optional(),
  count4_by: z.string().optional(),
  count1_at: z.number().optional(),
  count2_at: z.number().optional(),
  count3_at: z.number().optional(),
  count4_at: z.number().optional(),
  
  status: z.enum(['PENDING', 'FOUND', 'MISSING', 'EXTRA']).default('PENDING'),
  notes: z.string().optional(),
  finalStatus: z.boolean().optional(),
});

export const updateProductSerialControlSchema = z.object({
  hasSerialControl: z.boolean(),
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
export type InsertInventorySerialItem = z.infer<typeof insertInventorySerialItemSchema>;
export type SerialReadingRequestData = z.infer<typeof serialReadingRequestSchema>;
export type SerialReadingResponseData = z.infer<typeof serialReadingResponseSchema>;
export type ReconciliationReport = z.infer<typeof reconciliationReportSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
export type UpdateProductSerialControlData = z.infer<typeof updateProductSerialControlSchema>;

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
  assetTag: string;
  description: string;
  category?: string;
  location?: string;
  costValue?: number;
  serialNumber?: string;
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