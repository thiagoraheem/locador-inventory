import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Package, Barcode, DollarSign } from "lucide-react";
// AssetCountingForm component removed during cleanup
import type { Inventory, InventoryStockItem, StockItem } from "@shared/schema";

export default function InventoryAssetControl({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const inventoryId = parseInt(params.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<InventoryStockItem | null>(null);

  const { data: inventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${inventoryId}`],
  });

  const { data: inventoryStockItems, refetch: refetchItems } = useQuery<InventoryStockItem[]>({
    queryKey: [`/api/inventories/${inventoryId}/stock-items`],
  });

  const { data: stockItems } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
  });

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems?.find(item => item.id === stockItemId);
  };

  const getAssetStatus = (item: InventoryStockItem) => {
    if (item.finalQuantity !== undefined) return "completed";
    if (item.count1 !== undefined || item.count2 !== undefined || 
        item.count3 !== undefined || item.count4 !== undefined) return "in-progress";
    return "pending";
  };

  const filteredItems = inventoryStockItems?.filter(item => {
    const stockItemDetails = getStockItemDetails(item.stockItemId);
    const status = getAssetStatus(item);
    
    const matchesSearch = searchTerm === "" || 
      (stockItemDetails?.assetTag && stockItemDetails.assetTag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (stockItemDetails?.description && stockItemDetails.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (stockItemDetails?.serialNumber && stockItemDetails.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "in-progress": return "Em Andamento";
      case "pending": return "Pendente";
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAssetCount = (asset: InventoryStockItem) => {
    setSelectedAsset(asset);
  };

  const handleCountUpdate = () => {
    refetchItems();
    setSelectedAsset(null);
  };

  const getTotalValue = () => {
    return filteredItems.reduce((total, item) => {
      const stockItemDetails = getStockItemDetails(item.stockItemId);
      return total + (stockItemDetails?.costValue || 0);
    }, 0);
  };

  const getCompletedValue = () => {
    return filteredItems
      .filter(item => getAssetStatus(item) === "completed")
      .reduce((total, item) => {
        const stockItemDetails = getStockItemDetails(item.stockItemId);
        return total + (stockItemDetails?.costValue || 0);
      }, 0);
  };

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
          <h1 className="text-3xl font-bold">Controle de Patrimônio</h1>
          <p className="text-muted-foreground">
            {inventory?.code} - Inventário de Ativos
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Itens patrimoniais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventariados</CardTitle>
            <Barcode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredItems.filter(item => getAssetStatus(item) === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Contagem concluída
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalValue())}</div>
            <p className="text-xs text-muted-foreground">
              Valor dos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventariado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getCompletedValue())}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTotalValue() > 0 ? `${((getCompletedValue() / getTotalValue()) * 100).toFixed(1)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Busque por número de série, etiqueta patrimonial ou descrição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ativo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ativos</CardTitle>
          <CardDescription>
            Clique em "Contar" para registrar a presença/ausência do ativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockItemDetails = getStockItemDetails(item.stockItemId);
                  const status = getAssetStatus(item);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {stockItemDetails?.assetTag || '-'}
                      </TableCell>
                      <TableCell>
                        {stockItemDetails?.description || '-'}
                      </TableCell>
                      <TableCell>
                        {stockItemDetails?.serialNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {stockItemDetails?.location || '-'}
                      </TableCell>
                      <TableCell>
                        {stockItemDetails?.costValue ? 
                          formatCurrency(stockItemDetails.costValue) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {getStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleAssetCount(item)}
                          disabled={status === "completed"}
                        >
                          {status === "completed" ? "Contado" : "Contar"}
                        </Button>
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
                Nenhum ativo encontrado com os filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Counting Modal/Form */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Contar Ativo</h2>
            <p className="text-muted-foreground mb-4">
              Formulário de contagem em desenvolvimento
            </p>
            <Button onClick={() => setSelectedAsset(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}