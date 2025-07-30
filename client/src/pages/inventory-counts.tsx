import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Filter,
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import type { Inventory, InventoryItem, Product, Location } from "@shared/schema";

export default function InventoryCounts() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInventory, setSelectedInventory] = useState<number | null>(null);
  const [countValues, setCountValues] = useState<{ [itemId: number]: number | string }>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Get selected inventory details
  const selectedInventoryData = inventories?.find(inv => inv.id === selectedInventory);

  // Fetch inventory items for selected inventory
  const { data: inventoryItems, refetch: refetchItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventory}/items`],
    enabled: !!selectedInventory && selectedInventoryData?.status !== 'count3_open',
  });

  // Fetch divergent items for 3rd count (only items that need 3rd count)
  const { data: divergentItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventory}/items/divergent`],
    enabled: !!selectedInventory && selectedInventoryData?.status === 'count3_open',
  });

  // Use appropriate data source based on inventory status
  const currentItems = selectedInventoryData?.status === 'count3_open' ? divergentItems : inventoryItems;

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Update count mutation
  const updateCountMutation = useMutation({
    mutationFn: async ({ itemId, count, countType }: { itemId: number; count: number; countType: string }) => {
      const response = await fetch(`/api/inventory-items/${itemId}/${countType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update count');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem atualizada",
        description: "Contagem registrada com sucesso",
      });
      refetchItems();
      queryClient.invalidateQueries({ queryKey: [`/api/inventories/${selectedInventory}/stats`] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get active inventories that can be counted
  const activeInventories = inventories?.filter(inv => 
    ['open', 'count1_open', 'count2_open', 'count3_open'].includes(inv.status)
  ) || [];

  // Get current counting stage based on inventory status
  const getCurrentCountStage = (status: string) => {
    switch (status) {
      case 'open':
      case 'count1_open':
        return 1;
      case 'count1_closed':
      case 'count2_open':
        return 2;
      case 'count2_closed':
      case 'count3_open':
        return 3;
      default:
        return 1;
    }
  };

  // Get current count value for an item based on stage
  const getCurrentCount = (item: InventoryItem, stage: number) => {
    switch (stage) {
      case 1: return item.count1;
      case 2: return item.count2;
      case 3: return item.count3;
      default: return undefined;
    }
  };

  // Get item status based on count completion
  const getItemStatus = (item: InventoryItem, stage: number) => {
    const currentCount = getCurrentCount(item, stage);
    return currentCount !== undefined && currentCount !== null ? 'counted' : 'pending';
  };

  // Get final quantity status badge
  const getFinalQuantityStatus = (item: InventoryItem) => {
    if (item.finalQuantity !== null && item.finalQuantity !== undefined) {
      return { label: "Finalizado", variant: "secondary" as const };
    } else if (selectedInventoryData?.status === 'count3_required' || selectedInventoryData?.status === 'count3_open') {
      return { label: "Divergente", variant: "destructive" as const };
    }
    return null;
  };

  // Filter items based on search and status - BLIND COUNTING: hide already counted items
  const filteredItems = currentItems?.filter(item => {
    const product = products?.find(p => p.id === item.productId);
    const location = locations?.find(l => l.id === item.locationId);
    
    const matchesSearch = !searchTerm || 
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const selectedInv = inventories?.find(inv => inv.id === selectedInventory);
    const stage = selectedInv ? getCurrentCountStage(selectedInv.status) : 1;
    const status = getItemStatus(item, stage);
    
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    // BLIND COUNTING: Show only pending items by default, or counted items if specifically requested
    if (statusFilter === 'counted') {
      return matchesSearch && status === 'counted';
    } else {
      return matchesSearch && status === 'pending';
    }
  }) || [];

  // Função para verificar se o inventário permite contagem
  const canPerformCounting = (status: string): boolean => {
    return ['count1_open', 'count2_open', 'count3_open', 'count4_open'].includes(status);
  };

  const handleSaveCount = (itemId: number, stage: number) => {
    // Verificar se o inventário permite contagem
    const selectedInv = inventories?.find(inv => inv.id === selectedInventory);
    if (!selectedInv || !canPerformCounting(selectedInv.status)) {
      toast({
        title: "Contagem não permitida",
        description: "O inventário deve estar em status de contagem aberta (1ª, 2ª, 3ª ou 4ª contagem).",
        variant: "destructive",
      });
      return;
    }

    const countValue = countValues[itemId];
    if (!countValue || countValue === "" || isNaN(Number(countValue)) || Number(countValue) < 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um número válido (0 ou maior)",
        variant: "destructive",
      });
      return;
    }

    const countType = `count${stage}`;
    updateCountMutation.mutate({ 
      itemId, 
      count: Number(countValue), 
      countType 
    });
    
    // Clear the input after successful count
    setCountValues(prev => ({
      ...prev,
      [itemId]: ""
    }));
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return "1ª Contagem";
      case 2: return "2ª Contagem";
      case 3: return "3ª Contagem";
      default: return `${stage}ª Contagem`;
    }
  };

  const selectedInv = inventories?.find(inv => inv.id === selectedInventory);
  const currentStage = selectedInv ? getCurrentCountStage(selectedInv.status) : 1;

  return (
    <div>
      <Header title="Contagens de Inventário" subtitle="Registre as contagens dos itens de inventário" />
      
      <div className="space-y-6 p-4 md:p-6">
        {/* Inventory Selection */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Seleção de Inventário
          </CardTitle>
          <CardDescription>
            Selecione um inventário para realizar a contagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Inventário Ativo</label>
              <Select value={selectedInventory?.toString() || ""} onValueChange={(value) => setSelectedInventory(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um inventário..." />
                </SelectTrigger>
                <SelectContent>
                  {activeInventories.map((inventory) => (
                    <SelectItem key={inventory.id} value={inventory.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{inventory.code}</span>
                        <Badge variant="outline" className="text-xs">
                          {getStageLabel(getCurrentCountStage(inventory.status))}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedInv && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Atual</label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getStageLabel(currentStage)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedInv.description}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedInventory && (
        <>
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filtros de Contagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Item</label>
                  <Input
                    placeholder="Nome do produto, SKU ou local..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visualizar</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Apenas Pendentes (Contagem Às Cegas)</SelectItem>
                      <SelectItem value="counted">Mostrar Já Contados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Counting Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStageLabel(currentStage)}
                {selectedInventoryData?.status === 'count3_open' && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Apenas itens divergentes
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedInventoryData?.status === 'count3_open' ? 
                  "3ª Contagem - Apenas itens com divergência entre 1ª e 2ª contagem" :
                  "Contagem às cegas - registre apenas o que você consegue contar fisicamente"
                }
                {currentItems && (
                  <span className="ml-2 font-medium">
                    ({currentItems.filter(item => getItemStatus(item, currentStage) === 'counted').length}/{currentItems.length} itens {selectedInventoryData?.status === 'count3_open' ? 'divergentes ' : ''}contados)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Qtd. Contada</TableHead>
                      <TableHead>Status Final</TableHead>
                      <TableHead>Status Contagem</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {currentItems?.length === 0 ? 
                              selectedInventoryData?.status === 'count3_open' ?
                                "Nenhum item divergente encontrado - todas as contagens estão alinhadas!" :
                                "Nenhum item encontrado para este inventário" :
                              statusFilter === 'all' ? 
                                "Todos os itens pendentes já foram contados!" :
                                "Nenhum item corresponde aos filtros aplicados"
                            }
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        const product = products?.find(p => p.id === item.productId);
                        const location = locations?.find(l => l.id === item.locationId);
                        const currentCount = getCurrentCount(item, currentStage);
                        const status = getItemStatus(item, currentStage);
                        const countValue = countValues[item.id] ?? (currentCount || "");
                        const finalStatus = getFinalQuantityStatus(item);

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product?.name || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{product?.sku || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{location?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={canPerformCounting(selectedInv?.status || '') ? "Quantidade contada..." : "Contagem bloqueada"}
                                value={countValue}
                                onChange={(e) => setCountValues(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                className="w-32"
                                disabled={!canPerformCounting(selectedInv?.status || '')}
                                autoFocus
                              />
                            </TableCell>
                            <TableCell>
                              {finalStatus ? (
                                <Badge variant={finalStatus.variant}>
                                  <div className="flex items-center gap-1">
                                    {finalStatus.variant === 'secondary' ? 
                                      <CheckCircle className="h-3 w-3" /> : 
                                      <AlertTriangle className="h-3 w-3" />
                                    }
                                    {finalStatus.label}
                                  </div>
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Em andamento
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {canPerformCounting(selectedInv?.status || '') ? (
                                <Badge variant="secondary">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Aguardando Contagem
                                  </div>
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Contagem Bloqueada
                                  </div>
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleSaveCount(item.id, currentStage)}
                                disabled={updateCountMutation.isPending || !countValue || countValue === "" || !canPerformCounting(selectedInv?.status || '')}
                              >
                                {updateCountMutation.isPending ? "Salvando..." : "Registrar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}