import React from "react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardPolling } from "@/hooks/useDashboardPolling";
import Header from "@/components/layout/header";
import { InventoryDashboard, InventoryDashboardDemo } from "@/components/dashboard/InventoryDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Database,
  TrendingUp,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryDashboardPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showMoney, setShowMoney] = React.useState(true);
  const [demoMode, setDemoMode] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  // Redirect to home if not authenticated
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

  // Hook de polling para dados em tempo real
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
    enabled: !demoMode && isAuthenticated,
    pollingInterval: 30000, // 30 segundos
    onError: (error) => {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Opcional: mostrar toast de sucesso na primeira carga
    },
  });

  // Controle do polling baseado no autoRefresh
  useEffect(() => {
    if (autoRefresh && !demoMode) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [autoRefresh, demoMode, startPolling, stopPolling]);

  // Formatação da última atualização
  const formatLastUpdated = (date) => {
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

  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    toast({
      title: demoMode ? "Modo Produção" : "Modo Demo",
      description: demoMode 
        ? "Conectado aos dados reais do sistema." 
        : "Usando dados simulados para demonstração.",
    });
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: autoRefresh ? "Atualização automática desabilitada" : "Atualização automática habilitada",
      description: autoRefresh 
        ? "Os dados não serão atualizados automaticamente." 
        : "Os dados serão atualizados a cada 30 segundos.",
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
              {/* Refresh Button */}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={dashboardLoading}
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
                  onCheckedChange={setAutoRefresh}
                  disabled={demoMode}
                />
                <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                  {isPolling ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-gray-400" />}
                  Atualização automática
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