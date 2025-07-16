import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/data-table";
import { Clock, CheckCircle, Lock, AlertTriangle, Download, Play, Check } from "lucide-react";
import { useLocation } from "wouter";

export default function InventoryCounting() {
  const [location] = useLocation();
  const inventoryId = parseInt(location.split('/')[2]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false);
  const [countData, setCountData] = useState({ quantity: "", notes: "" });
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
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

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/inventories", inventoryId],
    retry: false,
    enabled: !!inventoryId,
  });

  const { data: inventoryItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/inventories", inventoryId, "items"],
    retry: false,
    enabled: !!inventoryId,
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PUT", `/api/inventories/${inventoryId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      toast({
        title: "Sucesso",
        description: "Status do inventário atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao atualizar inventário",
        variant: "destructive",
      });
    },
  });

  const createCountMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/counts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      setIsCountDialogOpen(false);
      setCountData({ quantity: "", notes: "" });
      toast({
        title: "Sucesso",
        description: "Contagem registrada com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao registrar contagem",
        variant: "destructive",
      });
    },
  });

  if (inventoryLoading || itemsLoading) {
    return (
      <div>
        <Header title="Contagem de Inventário" subtitle="Carregando..." />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div>
        <Header title="Inventário não encontrado" subtitle="O inventário solicitado não foi encontrado" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Aberto</Badge>;
      case 'COUNTING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Em Contagem</Badge>;
      case 'CLOSED':
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCountingStages = () => {
    const stages = [
      { id: 1, name: "1ª Contagem", status: "completed", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
      { id: 2, name: "2ª Contagem", status: "active", icon: Clock, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
      { id: 3, name: "3ª Contagem", status: "pending", icon: Lock, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
    ];

    return stages;
  };

  const calculateProgress = () => {
    if (!inventoryItems || inventoryItems.length === 0) return 0;
    const completedItems = inventoryItems.filter((item: any) => item.status === 'COMPLETED').length;
    return Math.round((completedItems / inventoryItems.length) * 100);
  };

  const getDiscrepancies = () => {
    if (!inventoryItems) return { items: 0, overCount: 0, underCount: 0 };
    
    let items = 0;
    let overCount = 0;
    let underCount = 0;

    inventoryItems.forEach((item: any) => {
      if (item.finalQuantity && item.expectedQuantity) {
        const final = parseFloat(item.finalQuantity);
        const expected = parseFloat(item.expectedQuantity);
        const diff = final - expected;
        
        if (diff !== 0) {
          items++;
          if (diff > 0) overCount += diff;
          else underCount += Math.abs(diff);
        }
      }
    });

    return { items, overCount, underCount };
  };

  const handleStartCounting = () => {
    updateInventoryMutation.mutate('COUNTING');
  };

  const handleFinishInventory = () => {
    updateInventoryMutation.mutate('CLOSED');
  };

  const handleAddCount = () => {
    if (!selectedItem || !countData.quantity) return;
    
    createCountMutation.mutate({
      inventoryItemId: selectedItem.id,
      countNumber: 1, // This should be determined by existing counts
      quantity: countData.quantity,
      notes: countData.notes,
    });
  };

  const columns = [
    {
      header: "SKU",
      accessorKey: "product.sku",
      sortable: true,
    },
    {
      header: "Produto",
      accessorKey: "product.name",
      sortable: true,
    },
    {
      header: "Local",
      accessorKey: "location.name",
      sortable: true,
    },
    {
      header: "Qtd. Esperada",
      accessorKey: "expectedQuantity",
      sortable: true,
      cell: (value: string) => parseFloat(value || "0").toLocaleString(),
    },
    {
      header: "Qtd. Final",
      accessorKey: "finalQuantity",
      sortable: true,
      cell: (value: string) => value ? parseFloat(value).toLocaleString() : "-",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (value: string) => {
        switch (value) {
          case 'PENDING':
            return <Badge variant="outline">Pendente</Badge>;
          case 'COUNTING':
            return <Badge variant="secondary">Em Contagem</Badge>;
          case 'COMPLETED':
            return <Badge variant="default">Concluído</Badge>;
          default:
            return <Badge variant="outline">{value}</Badge>;
        }
      },
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedItem(row);
            setIsCountDialogOpen(true);
          }}
          disabled={inventory.status === 'CLOSED'}
        >
          <Play className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const progress = calculateProgress();
  const discrepancies = getDiscrepancies();
  const stages = getCountingStages();

  return (
    <div>
      <Header 
        title={`Contagem de Inventário - ${inventory.code}`} 
        subtitle={`${inventory.type.name} • Criado em ${new Date(inventory.createdAt).toLocaleDateString()}`}
      />
      
      <div className="space-y-6">
        {/* Inventory Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Status do Inventário</span>
                {getStatusBadge(inventory.status)}
              </CardTitle>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Progresso Geral</p>
              <p className="text-xs text-gray-600">{progress}% concluído</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Progresso da Contagem</span>
                  <span className="text-sm font-medium text-gray-900">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Counting Stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.id} className={`${stage.bg} border ${stage.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        stage.status === 'completed' ? 'bg-green-500' : 
                        stage.status === 'active' ? 'bg-orange-500' : 
                        'bg-gray-300'
                      }`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${stage.color}`}>{stage.name}</p>
                        <p className="text-xs text-gray-600 capitalize">{
                          stage.status === 'completed' ? 'Concluída' :
                          stage.status === 'active' ? 'Em andamento' :
                          'Pendente'
                        }</p>
                      </div>
                    </div>
                    <span className={`text-sm ${stage.color}`}>
                      {stage.status === 'completed' ? '100%' :
                       stage.status === 'active' ? `${progress}%` :
                       '0%'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Discrepancy Analysis */}
        {discrepancies.items > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span>Divergências Encontradas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-yellow-800">{discrepancies.items}</p>
                  <p className="text-sm text-yellow-600">Produtos com divergência</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-yellow-800">+{discrepancies.overCount}</p>
                  <p className="text-sm text-yellow-600">Unidades a mais</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-yellow-800">-{discrepancies.underCount}</p>
                  <p className="text-sm text-yellow-600">Unidades a menos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Items Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens do Inventário</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
              {inventory.status === 'OPEN' && (
                <Button 
                  onClick={handleStartCounting}
                  disabled={updateInventoryMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Contagem
                </Button>
              )}
              {inventory.status === 'COUNTING' && (
                <Button 
                  onClick={handleFinishInventory}
                  disabled={updateInventoryMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Finalizar Inventário
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={inventoryItems || []}
              columns={columns}
              isLoading={itemsLoading}
            />
          </CardContent>
        </Card>

        {/* Count Dialog */}
        <Dialog open={isCountDialogOpen} onOpenChange={setIsCountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Contagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedItem && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">{selectedItem.product.name}</p>
                  <p className="text-xs text-gray-600">SKU: {selectedItem.product.sku}</p>
                  <p className="text-xs text-gray-600">Local: {selectedItem.location.name}</p>
                  <p className="text-xs text-gray-600">Qtd. Esperada: {parseFloat(selectedItem.expectedQuantity || "0").toLocaleString()}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="quantity">Quantidade Contada *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={countData.quantity}
                  onChange={(e) => setCountData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={countData.notes}
                  onChange={(e) => setCountData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre a contagem..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCountDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddCount}
                  disabled={!countData.quantity || createCountMutation.isPending}
                >
                  {createCountMutation.isPending ? "Salvando..." : "Registrar Contagem"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
