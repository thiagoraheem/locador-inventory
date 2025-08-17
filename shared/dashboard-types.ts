import React from "react";
import { InventoryStatus } from "./schema";

// Dashboard snapshot data structure adapted to project schema
export interface DashboardSnapshot {
  snapshotAt: string; // ISO timestamp
  inventoryId: number;
  inventoryCode: string;
  inventoryStatus: InventoryStatus;
  totals: DashboardTotals;
  counts: CountRoundData[];
  byLocation: LocationProgress[];
  pendingVsDone: PendingDoneData;
  divergences: DivergenceData[];
  adjustments: AdjustmentData;
  compliance: ComplianceData;
  items: DashboardItem[];
}

export interface DashboardTotals {
  itemsPlanned: number;
  itemsCounted: number;
  progressPct: number;
  accuracyPct: number;
  divergenceValueBRL: number;
  totalValue?: number;
  expectedValue?: number;
  finalValue?: number;
}

export interface CountRoundData {
  round: 1 | 2 | 3 | 4; // Aligned with project's 4-count system
  counted: number;
  consistentPct: number;
  timestamp?: number;
}

export interface LocationProgress {
  locationId: number;
  locationName: string;
  locationCode: string;
  progressPct: number;
  accuracyPct: number;
  itemsPlanned: number;
  itemsCounted: number;
  divergenceCount: number;
  divergenceValue?: number;
}

export interface PendingDoneData {
  pending: number;
  done: number;
  inProgress?: number;
}

export interface DivergenceData {
  type: DivergenceType;
  qty: number;
  valueBRL: number;
  percentage?: number;
}

export type DivergenceType = 
  | "Falta" 
  | "Sobra" 
  | "Erro de Registro" 
  | "Mov. Não Contab." 
  | "Divergência de Contagem"
  | "Item Extra";

export interface AdjustmentData {
  immediatePct: number;
  postponedPct: number;
  totalAdjustments?: number;
  pendingAdjustments?: number;
}

export interface ComplianceData {
  scheduleAdherencePct: number;
  movementsBlocked: boolean;
  preInventoryDone: boolean;
  needsBOOver20k: boolean;
  inventoryType?: "Cíclico" | "Rotativo" | "Extraordinário";
  blockSystemMovements?: boolean;
  signedLists?: boolean;
  doubleBlindCounting?: boolean;
}

export interface DashboardItem {
  itemId: string;
  inventoryItemId: number;
  productId: number;
  productSku: string;
  productName: string;
  locationId: number;
  locationName: string;
  categoryId?: number;
  categoryName?: string;
  expectedQty: number;
  count1Qty?: number;
  count2Qty?: number;
  count3Qty?: number;
  count4Qty?: number;
  finalQty?: number;
  divergence: ItemDivergence;
  status: ItemStatus;
  accuracy?: number;
  costValue?: number;
  totalValue?: number;
  lastCountAt?: number;
  lastCountBy?: number;
}

export interface ItemDivergence {
  type: DivergenceType | "Nenhuma";
  quantity: number;
  valueBRL: number;
  percentage?: number;
}

export type ItemStatus = 
  | "Pendente"
  | "Em Contagem"
  | "Conforme"
  | "Divergente"
  | "Recontagem Necessária"
  | "Auditoria"
  | "Concluído";

// Filter and configuration types
export interface DashboardFilters {
  locationIds?: number[];
  categoryIds?: number[];
  status?: ItemStatus[];
  divergenceTypes?: DivergenceType[];
  showOnlyDivergent?: boolean;
  countRound?: 1 | 2 | 3 | 4;
}

export interface DashboardConfig {
  showMoney: boolean;
  refreshInterval: number; // in milliseconds
  autoRefresh: boolean;
  theme?: "light" | "dark";
  compactView?: boolean;
}

// API response types
export interface DashboardApiResponse {
  success: boolean;
  data?: DashboardSnapshot;
  error?: string;
  timestamp: number;
}

export interface DashboardMetrics {
  totalInventories: number;
  activeInventories: number;
  completedToday: number;
  avgAccuracy: number;
  totalDivergenceValue: number;
  criticalDivergences: number;
}

// Chart data types for Recharts integration
export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface TimelineDataPoint {
  round: number;
  consistency: number;
  counted: number;
  timestamp?: number;
}

export interface ProgressChartData {
  location: string;
  progress: number;
  accuracy: number;
  items: number;
}

// Hook types
export interface UseDashboardPollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardSnapshot) => void;
}

export interface UseDashboardPollingReturn {
  data: DashboardSnapshot | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  pause: () => void;
  resume: () => void;
}

// Component prop types
export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
}

export interface ChartComponentProps {
  data: ChartDataPoint[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export interface CompliancePanelProps {
  compliance: ComplianceData;
  showMoney: boolean;
  className?: string;
}

export interface ItemsTableProps {
  items: DashboardItem[];
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  showMoney: boolean;
  loading?: boolean;
  className?: string;
}

// Utility types
export type SortDirection = "asc" | "desc";
export type SortField = keyof DashboardItem;

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// Error types
export interface DashboardError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// All types are already exported individually above