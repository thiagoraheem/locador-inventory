import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProcessDashboard } from "@/hooks/useProcessDashboard";
import Header from "@/components/layout/header";
import { InventoryDashboard, InventoryDashboardDemo } from "@/components/dashboard/InventoryDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProcessDashboardPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [showMoney, setShowMoney] = React.useState(true);
  const [demoMode, setDemoMode] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  // Default to last 30 days
  const [startDateStr, setStartDateStr] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  
  const [endDateStr, setEndDateStr] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

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

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling,
  } = useProcessDashboard({
    enabled: !demoMode && isAuthenticated && startDate !== null && endDate !== null,
    pollingInterval: 30000,
    dateRange: { startDate, endDate },
    onError: (error) => {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (autoRefresh && !demoMode) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [autoRefresh, demoMode, startPolling, stopPolling]);

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

  const handleRefresh = () => {
    if (demoMode) {
      toast({
        title: "Modo Demo",
        description: "Os dados são simulados no modo demo.",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Período inválido",
        description: "Selecione uma data inicial e final para atualizar o dashboard.",
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
        title="Dashboard do Processo"
        subtitle="Visão agregada de múltiplos inventários em um período"
      />
      
      {/* Controls Panel */}
      <div className="px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Filtro de Processo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label htmlFor="start-date">Data Inicial</Label>
                  <Input 
                    type="date" 
                    id="start-date" 
                    value={startDateStr} 
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date">Data Final</Label>
                  <Input 
                    type="date" 
                    id="end-date" 
                    value={endDateStr} 
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              {/* Refresh Button */}
              <Button 
                onClick={handleRefresh} 
                variant="default" 
                disabled={dashboardLoading || (!demoMode && (!startDate || !endDate))}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", dashboardLoading && "animate-spin")} />
                {dashboardLoading ? "Atualizando..." : "Aplicar Filtro"}
              </Button>

              <div className="flex-1"></div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                {/* Show Money Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-money"
                    checked={showMoney}
                    onCheckedChange={toggleShowMoney}
                  />
                  <Label htmlFor="show-money" className="flex items-center gap-2">
                    {showMoney ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {showMoney ? "Visível" : "Oculto"}
                  </Label>
                </div>

                {/* Auto Refresh Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={toggleAutoRefresh}
                    disabled={demoMode}
                  />
                  <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                    {isPolling ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-gray-400" />}
                    Auto
                  </Label>
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
                    Demo
                  </Label>
                </div>
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
              Erro ao carregar dados do processo: {dashboardError.message}
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
        ) : dashboardData?.totals?.itemsPlanned === 0 && !dashboardLoading ? (
            <Alert>
              <AlertDescription className="text-center py-6 text-muted-foreground">
                Nenhum inventário com itens planejado encontrado para o período selecionado.
              </AlertDescription>
            </Alert>
        ) : (
          <InventoryDashboard 
            data={dashboardData}
            config={{
              showMoney: true,
              autoRefresh: false,
              refreshInterval: 30000,
              showFilters: true,
              showExport: true,
              compactMode: false,
            }}
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
