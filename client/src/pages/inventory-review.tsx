// @ts-nocheck
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import DataTable from "@/components/data-table";
import { CheckCircle, AlertTriangle, Download, Lock, Info, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";

export default function InventoryReview() {
  const [location] = useLocation();
  const inventoryId = parseInt(location.split('/')[2]);
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

  const closeInventoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/inventories/${inventoryId}/close`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      toast({
        title: "Sucesso",
        description: "Inventário fechado e estoque atualizado com sucesso!",
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
        description: "Erro ao fechar inventário",
        variant: "destructive",
      });
    },
  });

  if (inventoryLoading || !inventory) {
    return (
      <div>
        <Header title="Revisão de Inventário" subtitle="Carregando..." />
        <div className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">Carregando inventário...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getDiscrepancies = () => {
    if (!inventoryItems) return { items: 0, overCount: 0, underCount: 0, discrepantItems: [] };
    
    let items = 0;
    let overCount = 0;
    let underCount = 0;
    const discrepantItems: any[] = [];

    inventoryItems.forEach((item: any) => {
      if (item.finalQuantity && item.expectedQuantity) {
        const final = parseFloat(item.finalQuantity);
        const expected = parseFloat(item.expectedQuantity);
        const diff = final - expected;
        
        if (diff !== 0) {
          items++;
          discrepantItems.push({ ...item, difference: diff });
          if (diff > 0) overCount += diff;
          else underCount += Math.abs(diff);
        }
      }
    });

    return { items, overCount, underCount, discrepantItems };
  };

  const getSummaryStats = () => {
    if (!inventoryItems) return { total: 0, completed: 0, pending: 0 };
    
    const total = inventoryItems.length;
    const completed = inventoryItems.filter((item: any) => item.status === 'COMPLETED').length;
    const pending = total - completed;

    return { total, completed, pending };
  };

  const handleCloseInventory = () => {
    closeInventoryMutation.mutate();
  };

  const stats = getSummaryStats();
  const discrepancies = getDiscrepancies();
  
  const discrepancyColumns = [
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
      header: "Qtd. Sistema",
      accessorKey: "expectedQuantity",
      sortable: true,
      cell: (value: string) => parseFloat(value || "0").toLocaleString(),
    },
    {
      header: "Qtd. Final",
      accessorKey: "finalQuantity",
      sortable: true,
      cell: (value: string) => parseFloat(value || "0").toLocaleString(),
    },
    {
      header: "Diferença",
      accessorKey: "difference",
      sortable: true,
      cell: (value: number) => (
        <span className={value > 0 ? 'text-green-600 font-medium' : value < 0 ? 'text-red-600 font-medium' : ''}>
          {value > 0 ? '+' : ''}{value.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Header 
        title={`Revisão de Inventário - ${inventory.code}`} 
        subtitle={`${inventory.type.name} • Criado em ${new Date(inventory.createdAt).toLocaleDateString()}`}
        actions={
          <Link href={`/inventory-counting/${inventoryId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Contagem
            </Button>
          </Link>
        }
      />
      
      <div className="space-y-6">
        {/* Status and Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Status do Inventário</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status atual:</span>
                  <Badge variant={inventory.status === 'CLOSED' ? 'default' : 'secondary'}>
                    {inventory.status === 'OPEN' ? 'Aberto' :
                     inventory.status === 'COUNTING' ? 'Em Contagem' : 'Fechado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data de início:</span>
                  <span className="text-sm font-medium">{new Date(inventory.startDate).toLocaleDateString()}</span>
                </div>
                {inventory.endDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data de fechamento:</span>
                    <span className="text-sm font-medium">{new Date(inventory.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Responsável:</span>
                  <span className="text-sm font-medium">{inventory.createdByUser.firstName || inventory.createdByUser.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span>Resumo da Contagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total de itens:</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Itens concluídos:</span>
                  <span className="text-lg font-semibold text-green-600">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Itens pendentes:</span>
                  <span className="text-lg font-semibold text-orange-600">{stats.pending}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Progresso:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {Math.round((stats.completed / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discrepancy Analysis */}
        {discrepancies.items > 0 ? (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span>Análise de Divergências</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-yellow-800">{discrepancies.items}</p>
                  <p className="text-sm text-yellow-600">Produtos com divergência</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-green-600">+{discrepancies.overCount.toLocaleString()}</p>
                  <p className="text-sm text-green-600">Unidades excedentes</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-red-600">-{discrepancies.underCount.toLocaleString()}</p>
                  <p className="text-sm text-red-600">Unidades faltantes</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="text-lg font-semibold text-yellow-800 mb-4">Detalhes das Divergências</h4>
                <DataTable
                  data={discrepancies.discrepantItems}
                  columns={discrepancyColumns}
                  isLoading={itemsLoading}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-8">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">Inventário sem Divergências</h3>
                <p className="text-green-600">Todas as contagens estão alinhadas com as quantidades esperadas.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Section */}
        {inventory.status === 'COUNTING' && (
          <>
            <Separator />
            
            {stats.pending > 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ainda existem {stats.pending} itens pendentes de contagem. Complete todas as contagens antes de fechar o inventário.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Todas as contagens foram concluídas. Você pode fechar o inventário para atualizar o estoque automaticamente.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Fechamento do Inventário</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Ao fechar o inventário, as quantidades em estoque serão automaticamente atualizadas com base nos resultados das contagens.
                    Esta ação não pode ser desfeita.
                  </p>
                  
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Relatório Final
                    </Button>
                    
                    <Button 
                      onClick={handleCloseInventory}
                      disabled={closeInventoryMutation.isPending || stats.pending > 0}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {closeInventoryMutation.isPending ? "Fechando..." : "Fechar Inventário"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {inventory.status === 'CLOSED' && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="py-8">
              <div className="text-center">
                <Lock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Inventário Fechado</h3>
                <p className="text-gray-600">Este inventário foi fechado e o estoque foi atualizado automaticamente.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}