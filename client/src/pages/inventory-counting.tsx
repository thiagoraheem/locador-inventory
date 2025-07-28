
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryItem, Product, Location } from "@shared/schema";

export default function InventoryCounting({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const inventoryId = parseInt(params.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [countValues, setCountValues] = useState<{ [itemId: number]: number | string }>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${inventoryId}`],
  });

  const { data: inventoryItems, refetch: refetchItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${inventoryId}/items`],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

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
        title: "Contagem registrada",
        description: "Contagem registrada com sucesso",
      });
      refetchItems();
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCurrentCountStage = () => {
    if (!inventory) return 'count1';
    
    switch (inventory.status) {
      case 'count1':
      case 'open':
        return 'count1';
      case 'count2':
        return 'count2';
      case 'count3':
        return 'count3';
      case 'audit':
        return 'count4';
      default:
        return 'count1';
    }
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || `Product ${productId}`;
  };

  const getLocationName = (locationId: number) => {
    return locations?.find(l => l.id === locationId)?.name || `Location ${locationId}`;
  };

  const getCurrentCount = (item: InventoryItem) => {
    const stage = getCurrentCountStage();
    switch (stage) {
      case 'count1': return item.count1;
      case 'count2': return item.count2;
      case 'count3': return item.count3;
      case 'count4': return item.count4;
      default: return undefined;
    }
  };

  const getItemStatus = (item: InventoryItem) => {
    const stage = getCurrentCountStage();
    const currentCount = getCurrentCount(item);
    
    if (currentCount !== undefined) return "completed";
    return "pending";
  };

  const filteredItems = inventoryItems?.filter(item => {
    const productName = getProductName(item.productId);
    const locationName = getLocationName(item.locationId);
    
    const matchesSearch = searchTerm === "" || 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLocation = locationFilter === "all" || item.locationId.toString() === locationFilter;
    
    return matchesSearch && matchesLocation;
  }) || [];

  const handleCountChange = (itemId: number, value: string) => {
    setCountValues(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSaveCount = (itemId: number) => {
    const value = countValues[itemId];
    const count = typeof value === 'string' ? parseInt(value) : value;
    
    if (isNaN(count) || count < 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um número válido",
        variant: "destructive",
      });
      return;
    }

    const countType = getCurrentCountStage();
    updateCountMutation.mutate({ itemId, count, countType });
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'count1': return 'Primeira Contagem (C1)';
      case 'count2': return 'Segunda Contagem (C2)';
      case 'count3': return 'Terceira Contagem (C3)';
      case 'count4': return 'Contagem de Auditoria (C4)';
      default: return 'Contagem';
    }
  };

  const pendingItems = filteredItems.filter(item => getItemStatus(item) === "pending");
  const completedItems = filteredItems.filter(item => getItemStatus(item) === "completed");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/inventories")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Contagem de Inventário</h1>
          <p className="text-muted-foreground">
            {inventory?.code} - {getStageLabel(getCurrentCountStage())}
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedItems.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Locais</SelectItem>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Counting Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getStageLabel(getCurrentCountStage())}</CardTitle>
          <CardDescription>
            Registre as quantidades contadas para cada produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Qtd. Esperada</TableHead>
                  <TableHead>Qtd. Contada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const currentCount = getCurrentCount(item);
                  const status = getItemStatus(item);
                  const countValue = countValues[item.id] ?? (currentCount || '');

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {getProductName(item.productId)}
                      </TableCell>
                      <TableCell>{getLocationName(item.locationId)}</TableCell>
                      <TableCell className="font-bold">{item.expectedQuantity}</TableCell>
                      <TableCell>
                        {status === "completed" && currentCount !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">{currentCount}</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            value={countValue}
                            onChange={(e) => handleCountChange(item.id, e.target.value)}
                            placeholder="Quantidade"
                            className="w-24"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={status === "completed" ? "default" : "outline"}
                          className={status === "completed" ? "bg-green-500" : ""}
                        >
                          {status === "completed" ? "Concluído" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveCount(item.id)}
                            disabled={!countValues[item.id] || countValues[item.id] === ''}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhum item encontrado com os filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
