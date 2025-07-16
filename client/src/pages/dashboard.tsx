import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import StatsCards from "@/components/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart3, MapPin, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: inventories, isLoading: inventoriesLoading } = useQuery({
    queryKey: ["/api/inventories"],
    retry: false,
  });

  if (statsLoading || inventoriesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  const activeInventories = inventories?.filter((inv: any) => inv.status === 'OPEN' || inv.status === 'COUNTING') || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/products">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Novo Produto</p>
                    <p className="text-xs text-gray-600">Cadastrar produto</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/locations">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Novo Local</p>
                    <p className="text-xs text-gray-600">Cadastrar local</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/inventories">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Criar Inventário</p>
                    <p className="text-xs text-gray-600">Novo inventário</p>
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/audit-logs">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Relatórios</p>
                    <p className="text-xs text-gray-600">Gerar relatório</p>
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Inventories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventários em Andamento</CardTitle>
            <Link href="/inventories">
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInventories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum inventário ativo</p>
              ) : (
                activeInventories.slice(0, 3).map((inventory: any) => (
                  <div key={inventory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{inventory.code}</p>
                        <p className="text-xs text-gray-600">{inventory.type.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={inventory.status === 'OPEN' ? 'default' : 'secondary'}>
                        {inventory.status === 'OPEN' ? 'Aberto' : 'Em Contagem'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - Placeholder */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atividade Recente</CardTitle>
            <Link href="/audit-logs">
              <Button variant="ghost" size="sm">Ver logs</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">Sistema inicializado com sucesso</p>
                  <p className="text-xs text-gray-600">Agora</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
