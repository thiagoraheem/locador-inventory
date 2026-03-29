import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardPolling } from "@/hooks/useDashboardPolling";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import {
  getInventoryLifecycleLabel,
  isClosedInventoryStatus,
  validateManualRefresh,
} from "@/pages/inventory-dashboard-control";
import Header from "@/components/layout/header";
import { InventoryDashboard, InventoryDashboardDemo } from "@/components/dashboard/InventoryDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Database,
  TrendingUp,
  Wifi,
  WifiOff,
  CircleDot,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

type InventorySummary = {
  id: number;
  code?: string;
  description?: string;
  status?: string;
};

export default function InventoryDashboardPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedInventoryId, setSelectedInventoryId } = useSelectedInventory();
  const [showMoney, setShowMoney] = React.useState(true);
  const [demoMode, setDemoMode] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const { data: inventories = [], isLoading: inventoriesLoading } = useQuery<InventorySummary[]>({
    queryKey: ["/api/inventories"],
    enabled: isAuthenticated,
  });

  const selectedInventory = useMemo(() => {
    if (!inventories.length) return null;
    if (selectedInventoryId == null) return inventories[0];
    return inventories.find((inventory) => inventory.id === selectedInventoryId) || inventories[0];
  }, [inventories, selectedInventoryId]);

  const selectedInventoryStatus = selectedInventory?.status || null;
  const selectedInventoryClosed = isClosedInventoryStatus(selectedInventoryStatus);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você foi desconectado. Fazendo login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (inventories.length > 0 && selectedInventoryId == null) {
      setSelectedInventoryId(inventories[0].id);
    }
  }, [inventories, selectedInventoryId, setSelectedInventoryId]);

  useEffect(() => {
    if (selectedInventoryClosed && autoRefresh) {
      setAutoRefresh(false);
      toast({
        title: "Atualização automática desabilitada",
        description: "Inventários fechados não permitem atualização automática.",
      });
    }
  }, [selectedInventoryClosed, autoRefresh, toast]);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling,
  } = useDashboardPolling({
    enabled: !demoMode && isAuthenticated && Boolean(selectedInventory),
    pollingInterval: 30000,
    inventoryContext: {
      id: selectedInventory?.id,
      code: selectedInventory?.code,
      status: selectedInventory?.status,
    },
    onError: (error) => {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (autoRefresh && !demoMode && !selectedInventoryClosed) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [autoRefresh, demoMode, selectedInventoryClosed, startPolling, stopPolling]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds}s atrás`;
    if (minutes < 60) return `${minutes}m atrás`;
    return date.toLocaleTimeString();
  };

  const handleInventoryChange = (inventoryId: string) => {
    setSelectedInventoryId(Number(inventoryId));
  };

  const handleRefresh = () => {
    const refreshValidation = validateManualRefresh({
      demoMode,
      hasSelectedInventory: Boolean(selectedInventory),
      inventoryStatus: selectedInventoryStatus,
    });

    if (refreshValidation.reason === "demo_mode") {
      toast({
        title: "Modo Demo",
        description: "Os dados são simulados no modo demo.",
      });
      return;
    }

    if (refreshValidation.reason === "missing_inventory") {
      toast({
        title: "Selecione um inventário",
        description: "Escolha um inventário para visualizar os dados no dashboard.",
        variant: "destructive",
      });
      return;
    }

    if (refreshValidation.reason === "inventory_closed") {
      toast({
        title: "Inventário fechado",
        description: "Não é permitido atualizar dados de inventários fechados.",
        variant: "destructive",
      });
      return;
    }

    refetchDashboard();
    toast({
      title: "Atualizando dados",
      description: "Dashboard sendo atualizado...",
    });
  };

  const toggleShowMoney = () => {
    setShowMoney(!showMoney);
    toast({
      title: showMoney ? "Valores ocultos" : "Valores exibidos",
      description: showMoney 
        ? "Os valores monetários foram ocultados." 
        : "Os valores monetários estão sendo exibidos.",
    });
  };

  const toggleDemoMode = (checked: boolean) => {
    setDemoMode(checked);
    toast({
      title: checked ? "Modo Demo" : "Modo Produção",
      description: checked
        ? "Usando dados simulados para demonstração."
        : "Conectado aos dados reais do sistema.",
    });
  };

  const toggleAutoRefresh = (checked: boolean) => {
    if (selectedInventoryClosed && checked) {
      toast({
        title: "Inventário fechado",
        description: "A atualização automática permanece desabilitada para inventários fechados.",
      });
      return;
    }

    setAutoRefresh(checked);
    toast({
      title: checked ? "Atualização automática habilitada" : "Atualização automática desabilitada",
      description: checked
        ? "Os dados serão atualizados a cada 30 segundos."
        : "Os dados não serão atualizados automaticamente.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard de Inventário"
        subtitle="Visão analítica e operacional do inventário em tempo real"
      />
      
      {/* Controls Panel */}
      <div className="px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Controles do Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 min-w-[260px]">
                <Label htmlFor="inventory-selector">Inventário</Label>
                <Select
                  value={selectedInventory ? selectedInventory.id.toString() : ""}
                  onValueChange={handleInventoryChange}
                  disabled={inventoriesLoading || inventories.length === 0}
                >
                  <SelectTrigger id="inventory-selector" className="w-[320px]">
                    <SelectValue placeholder="Selecione um inventário" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventories.map((inventory) => {
                      const statusLabel = getInventoryLifecycleLabel(inventory.status);
                      const closed = isClosedInventoryStatus(inventory.status);
                      return (
                        <SelectItem key={inventory.id} value={inventory.id.toString()}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-medium">{inventory.code || `Inventário ${inventory.id}`}</span>
                            <Badge
                              variant={closed ? "secondary" : "default"}
                              className={closed ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}
                            >
                              {closed ? <Lock className="h-3 w-3 mr-1" /> : <CircleDot className="h-3 w-3 mr-1" />}
                              {statusLabel}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedInventory && (
                  <Badge
                    variant={selectedInventoryClosed ? "secondary" : "default"}
                    className={selectedInventoryClosed ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}
                  >
                    {selectedInventoryClosed ? <Lock className="h-3 w-3 mr-1" /> : <CircleDot className="h-3 w-3 mr-1" />}
                    {getInventoryLifecycleLabel(selectedInventoryStatus)}
                  </Badge>
                )}
              </div>

              {/* Refresh Button */}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={dashboardLoading || selectedInventoryClosed || (!demoMode && !selectedInventory)}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", dashboardLoading && "animate-spin")} />
                {dashboardLoading ? "Atualizando..." : "Atualizar"}
              </Button>

              {/* Show Money Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-money"
                  checked={showMoney}
                  onCheckedChange={toggleShowMoney}
                />
                <Label htmlFor="show-money" className="flex items-center gap-2">
                  {showMoney ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showMoney ? "Valores visíveis" : "Valores ocultos"}
                </Label>
              </div>

              {/* Auto Refresh Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={toggleAutoRefresh}
                  disabled={demoMode || selectedInventoryClosed}
                />
                <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                  {isPolling ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-gray-400" />}
                  Atualização automática
                </Label>
                {selectedInventoryClosed && !demoMode && (
                  <Badge variant="outline" className="ml-1">
                    Bloqueada para fechado
                  </Badge>
                )}
                {!demoMode && lastUpdated && (
                  <Badge variant="outline" className="ml-2">
                    {formatLastUpdated(lastUpdated)}
                  </Badge>
                )}
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="demo-mode"
                  checked={demoMode}
                  onCheckedChange={toggleDemoMode}
                />
                <Label htmlFor="demo-mode" className="flex items-center gap-2">
                  {demoMode ? <TrendingUp className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                  {demoMode ? "Modo Demo" : "Dados Reais"}
                </Label>
                {demoMode && (
                  <Badge variant="secondary" className="ml-2">
                    DEMO
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {!demoMode && dashboardError && (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados do dashboard: {dashboardError.message}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                className="ml-2"
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {!demoMode && dashboardLoading && (
        <div className="px-4 md:px-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="px-4 md:px-6">
        {demoMode ? (
          <InventoryDashboardDemo 
            showMoney={showMoney}
            className="w-full"
          />
        ) : (
          <InventoryDashboard 
            data={dashboardData}
            showMoney={showMoney}
            loading={dashboardLoading}
            error={dashboardError}
            onRefresh={handleRefresh}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
