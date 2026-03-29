import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ShowMoneyProvider, useShowMoney } from "../../contexts/ShowMoneyContext";
import {
  RefreshCw,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  Download,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";

// Import all dashboard components
import KpiCard, { ProgressKpiCard, AccuracyKpiCard, MoneyKpiCard } from "./KpiCard";
import ProgressBar, { CountingProgressBar, AccuracyProgressBar } from "./ProgressBar";
import DonutChart, { AccuracyDonutChart, StatusDonutChart, DivergenceDonutChart } from "./DonutChart";
import BarChart, { DivergenceBarChart, LocationProgressBarChart, CountRoundsBarChart } from "./BarChart";
import LineChart, { ConsistencyTimelineChart, ProgressOverTimeChart } from "./LineChart";
import CompliancePanel, { ProcessStatusPanel, SecurityCompliancePanel } from "./CompliancePanel";
import ItemsTable, { DivergentItemsTable, PendingItemsTable, HighValueItemsTable } from "./ItemsTable";

// Import types and mock data
import { 
  InventoryDashboardProps, 
  DashboardSnapshot, 
  DashboardItem,
  DashboardConfig 
} from "../../../../shared/dashboard-types";
import { mockDashboardData, mockEmptyDashboard, mockHighDivergenceDashboard } from "../../data/mockDashboardData";

export const normalizeDashboardSnapshot = (data: DashboardSnapshot) => {
  const safeTotals = {
    itemsPlanned: Number(data.totals?.itemsPlanned ?? 0),
    itemsCounted: Number(data.totals?.itemsCounted ?? 0),
    progressPct: Number(data.totals?.progressPct ?? 0),
    accuracyPct: Number(data.totals?.accuracyPct ?? 0),
    divergenceValueBRL: Number(data.totals?.divergenceValueBRL ?? 0),
  };
  const safeCompliance = {
    scheduleAdherencePct: Number((data as any).compliance?.scheduleAdherencePct ?? 0),
    movementsBlocked: Boolean((data as any).compliance?.movementsBlocked ?? false),
    preInventoryDone: Boolean((data as any).compliance?.preInventoryDone ?? false),
    needsBOOver20k: Boolean((data as any).compliance?.needsBOOver20k ?? false),
    inventoryType: (data as any).compliance?.inventoryType,
    blockSystemMovements: Boolean((data as any).compliance?.blockSystemMovements ?? false),
    signedLists: Boolean((data as any).compliance?.signedLists ?? false),
    doubleBlindCounting: Boolean((data as any).compliance?.doubleBlindCounting ?? false),
  };
  const safeItems = Array.isArray((data as any).items) ? data.items : [];
  const safePending = Number(data.pendingVsDone?.pending ?? 0);
  const safeDone = Number(data.pendingVsDone?.done ?? 0);
  const safeInProgress = Number(data.pendingVsDone?.inProgress ?? 0);
  const safeDivergences = (data.divergences || []).map((divergence) => ({
    type: divergence?.type || "Não informado",
    count: Number((divergence as any)?.count ?? (divergence as any)?.qty ?? 0),
    value: Number((divergence as any)?.value ?? (divergence as any)?.valueBRL ?? 0),
  }));
  const safeByLocation = (data.byLocation || []).map((location, index) => ({
    location: location.locationName || location.locationCode || `Local ${index + 1}`,
    counted: Number(location.itemsCounted ?? 0),
    total: Number(location.itemsPlanned ?? 0),
  }));
  const safeCounts = (data.counts || []).map((round) => ({
    round: Number(round.round || 0),
    items: Number((round as any).items ?? round.counted ?? 0),
  }));
  const safeSnapshotAt = data.snapshotAt ? new Date(data.snapshotAt) : new Date();
  const noDivergenceCount = safeItems.filter((item) => Number(item.divergence?.quantity ?? 0) === 0).length;
  const minorDivergenceCount = safeItems.filter((item) => {
    const value = Math.abs(Number(item.divergence?.quantity ?? 0));
    return value > 0 && value <= 2;
  }).length;
  const majorDivergenceCount = Math.max(0, safeItems.length - noDivergenceCount - minorDivergenceCount);
  const adjustmentCards = [
    { type: "Ajustes Imediatos", count: Number(data.adjustments?.totalAdjustments ?? 0), totalValue: Number(data.adjustments?.immediatePct ?? 0) },
    { type: "Ajustes Postergados", count: Number(data.adjustments?.pendingAdjustments ?? 0), totalValue: Number(data.adjustments?.postponedPct ?? 0) },
  ];

  return {
    safeTotals,
    safeCompliance,
    safeItems,
    safePending,
    safeDone,
    safeInProgress,
    safeDivergences,
    safeByLocation,
    safeCounts,
    safeSnapshotAt,
    noDivergenceCount,
    minorDivergenceCount,
    majorDivergenceCount,
    adjustmentCards,
  };
};

const DashboardContent: React.FC<InventoryDashboardProps> = ({
  data,
  config = {
    showMoney: true,
    autoRefresh: true,
    refreshInterval: 30000,
    showFilters: true,
    showExport: true,
    compactMode: false
  },
  loading = false,
  error,
  onRefresh,
  onItemClick,
  onExport,
  className
}) => {
  const { showMoney, toggleShowMoney } = useShowMoney();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<"overview" | "details" | "compliance">("overview");

  // Auto-refresh functionality
  useEffect(() => {
    if (!config.autoRefresh || !config.refreshInterval) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh?.();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    onExport?.(data);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn("space-y-4 sm:space-y-6 p-4 sm:p-6", className)}>
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Skeleton className="h-8 sm:h-10 w-full sm:w-32" />
            <Skeleton className="h-8 sm:h-10 w-full sm:w-24" />
          </div>
        </div>
        
        {/* KPI Cards Loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                  <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
                  <Skeleton className="h-2 sm:h-3 w-20 sm:w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Charts Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3">
                <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 sm:h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-4 sm:p-6", className)}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0">
              <span className="flex-1">Erro ao carregar o dashboard: {error instanceof Error ? error.message : String(error)}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="w-full sm:w-auto sm:ml-2"
              >
                Tentar novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={cn("p-4 sm:p-6", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0">
              <span className="flex-1">Nenhum dado disponível para exibir.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="w-full sm:w-auto sm:ml-2"
              >
                Atualizar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatLastUpdated = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getOverallStatus = ({
    totals,
    compliance,
  }: {
    totals: { progressPct: number; accuracyPct: number; divergenceValueBRL: number };
    compliance: { preInventoryDone: boolean; movementsBlocked: boolean };
  }) => {
    if (totals.progressPct >= 100) {
      return { status: "completed", label: "Concluído", color: "text-green-600" };
    }
    
    if (totals.accuracyPct < 90 || totals.divergenceValueBRL > 10000) {
      return { status: "warning", label: "Atenção", color: "text-yellow-600" };
    }
    
    if (!compliance.preInventoryDone || !compliance.movementsBlocked) {
      return { status: "error", label: "Crítico", color: "text-red-600" };
    }
    
    return { status: "in_progress", label: "Em Andamento", color: "text-blue-600" };
  };

  const normalizedData = normalizeDashboardSnapshot(data);
  const {
    safeTotals,
    safeCompliance,
    safeItems,
    safePending,
    safeDone,
    safeInProgress,
    safeDivergences,
    safeByLocation,
    safeCounts,
    safeSnapshotAt,
    noDivergenceCount,
    minorDivergenceCount,
    majorDivergenceCount,
    adjustmentCards,
  } = normalizedData;
  const overallStatus = getOverallStatus({ totals: safeTotals, compliance: safeCompliance });

  return (
    <div className={cn("space-y-4 sm:space-y-6 p-4 sm:p-6", className)}>
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard de Inventário</h1>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Snapshot: {safeSnapshotAt.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Atualizado: {formatLastUpdated(lastUpdated)}</span>
            </div>
            <Badge className={overallStatus.color} variant="outline" size="sm">
              {overallStatus.label}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border p-1 w-full sm:w-auto">
            <Button
              variant={selectedView === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("overview")}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </Button>
            <Button
              variant={selectedView === "details" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("details")}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Detalhes</span>
              <span className="sm:hidden">Det.</span>
            </Button>
            <Button
              variant={selectedView === "compliance" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("compliance")}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Conformidade</span>
              <span className="sm:hidden">Conf.</span>
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleShowMoney}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              {showMoney ? <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
              <span className="hidden sm:inline">{showMoney ? 'Ocultar Valores' : 'Mostrar Valores'}</span>
              <span className="sm:hidden">{showMoney ? 'Ocultar' : 'Mostrar'}</span>
            </Button>
            
            {config.showExport && (
              <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Export</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4 mr-1", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview View */}
      {selectedView === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ProgressKpiCard
              title="Progresso Geral"
              progress={safeTotals.itemsCounted}
              total={safeTotals.itemsPlanned}
            />
            
            <AccuracyKpiCard
              title="Acuracidade"
              accuracy={safeTotals.accuracyPct}
            />
            
            {showMoney && (
              <MoneyKpiCard
                title="Divergência Financeira"
                value={safeTotals.divergenceValueBRL}
                showMoney={showMoney}
              />
            )}
            
            <KpiCard
              title="Itens Pendentes"
              value={safePending}
              subtitle={`${safeTotals.itemsPlanned > 0 ? ((safePending / safeTotals.itemsPlanned) * 100).toFixed(1) : "0.0"}% do total`}
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <CountingProgressBar
              counted={safeTotals.itemsCounted}
              total={safeTotals.itemsPlanned}
              title="Progresso de Contagem"
            />
            
            <AccuracyProgressBar
              accuracy={safeTotals.accuracyPct}
              title="Nível de Acuracidade"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <StatusDonutChart
              pending={safePending}
              inProgress={safeInProgress}
              completed={safeDone}
              title="Status dos Itens"
            />
            
            <DivergenceBarChart
              data={safeDivergences}
              title="Divergências por Tipo"
            />
            
            <LocationProgressBarChart
              data={safeByLocation}
              title="Progresso por Localização"
            />
            
            <ConsistencyTimelineChart
              data={[
                { timestamp: "2024-01-15T08:00:00Z", accuracy: 85, progress: 20 },
                { timestamp: "2024-01-15T10:00:00Z", accuracy: 88, progress: 45 },
                { timestamp: "2024-01-15T12:00:00Z", accuracy: 92, progress: 65 },
                { timestamp: "2024-01-15T14:00:00Z", accuracy: 89, progress: 80 },
                { timestamp: "2024-01-15T16:00:00Z", accuracy: 94, progress: 95 }
              ]}
              title="Timeline de Consistência"
            />
          </div>
        </>
      )}

      {/* Details View */}
      {selectedView === "details" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CountRoundsBarChart
              data={safeCounts}
              title="Itens por Rodada de Contagem"
            />
            
            <DivergenceDonutChart
              noDivergence={noDivergenceCount}
              minorDivergence={minorDivergenceCount}
              majorDivergence={majorDivergenceCount}
              title="Distribuição de Divergências"
            />
          </div>
          
          <div className="space-y-6">
            <DivergentItemsTable
              items={safeItems}
              onItemClick={onItemClick}
            />
            
            <PendingItemsTable
              items={safeItems}
              onItemClick={onItemClick}
            />
            
            {showMoney && (
              <HighValueItemsTable
                items={safeItems}
                minValue={5000}
                onItemClick={onItemClick}
              />
            )}
          </div>
        </>
      )}

      {/* Compliance View */}
      {selectedView === "compliance" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompliancePanel
              data={safeCompliance as any}
              title="Conformidade do Processo"
            />
            
            <ProcessStatusPanel
              inventoryStarted={true}
              inventoryCompleted={safeTotals.progressPct >= 100}
              reportsGenerated={false}
              auditCompleted={false}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityCompliancePanel
              accessControlEnabled={true}
              auditLogEnabled={true}
              dataEncrypted={true}
              backupCompleted={true}
              lastBackup={new Date().toISOString()}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Ajustes Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adjustmentCards.map((adjustment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{adjustment.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {adjustment.count} ajustes
                        </p>
                      </div>
                      <Badge variant="outline">
                        {showMoney ? 
                          new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(adjustment.totalValue) :
                          `${adjustment.count} itens`
                        }
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Full Items Table (always visible at bottom) */}
      <ItemsTable
        items={safeItems}
        title="Todos os Itens"
        showFilters={config.showFilters}
        showExport={config.showExport}
        onItemClick={onItemClick}
        onExport={(items) => onExport?.(data, items)}
      />
    </div>
  );
};

const InventoryDashboard: React.FC<InventoryDashboardProps> = (props) => {
  return (
    <ShowMoneyProvider>
      <DashboardContent {...props} />
    </ShowMoneyProvider>
  );
};

export { InventoryDashboard };
export default InventoryDashboard;

// Demo component with mock data
export const InventoryDashboardDemo: React.FC<{
  scenario?: "normal" | "empty" | "high_divergence";
  showMoney?: boolean;
  className?: string;
}> = ({ scenario = "normal", showMoney = true, className }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(() => {
    switch (scenario) {
      case "empty":
        return mockEmptyDashboard;
      case "high_divergence":
        return mockHighDivergenceDashboard;
      default:
        return mockDashboardData;
    }
  });

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleItemClick = (item: DashboardItem) => {
    // Item click handler - implementar navegação se necessário
  };

  const handleExport = (data: DashboardSnapshot, items?: DashboardItem[]) => {
    // Export handler - implementar lógica de exportação se necessário
  };

  return (
    <InventoryDashboard
      data={data}
      config={{ showMoney, autoRefresh: true, refreshInterval: 30000, showFilters: true, showExport: true, compactMode: false }}
      loading={loading}
      onRefresh={handleRefresh}
      onItemClick={handleItemClick}
      onExport={handleExport}
      className={className}
    />
  );
};
