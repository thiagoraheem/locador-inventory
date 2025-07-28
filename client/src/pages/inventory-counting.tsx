import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, AlertTriangle, CheckCircle } from "lucide-react";
import CountingStageCard from "@/components/counting-stage-card";
import type { Inventory, InventoryItem, Product, Location } from "@shared/schema";

interface CountingSequence {
  current: number;
  completed: number[];
  nextRequired?: number;
}

export default function InventoryCounting({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const inventoryId = parseInt(params.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const getCountingSequence = (item: InventoryItem): CountingSequence => {
    const completed = [];
    if (item.count1 !== undefined) completed.push(1);
    if (item.count2 !== undefined) completed.push(2);
    if (item.count3 !== undefined) completed.push(3);
    if (item.count4 !== undefined) completed.push(4);

    const current = completed.length > 0 ? Math.max(...completed) : 0;
    let nextRequired: number | undefined;

    // Business logic for required counts
    if (completed.length === 0) {
      nextRequired = 1; // First count is always required
    } else if (completed.length === 1) {
      // Second count required if there's divergence in first count
      const difference = Math.abs((item.count1 || 0) - item.expectedQuantity);
      if (difference > 0) {
        nextRequired = 2;
      }
    } else if (completed.length === 2) {
      // Third count required if first two counts don't match
      const diff1 = Math.abs((item.count1 || 0) - item.expectedQuantity);
      const diff2 = Math.abs((item.count2 || 0) - item.expectedQuantity);
      if (diff1 > 0 || diff2 > 0 || item.count1 !== item.count2) {
        nextRequired = 3;
      }
    } else if (completed.length === 3) {
      // Audit count (count4) required for high-value items or persistent divergence
      const hasSignificantDivergence = 
        Math.abs((item.count3 || 0) - item.expectedQuantity) > item.expectedQuantity * 0.1;
      if (hasSignificantDivergence) {
        nextRequired = 4;
      }
    }

    return { current, completed, nextRequired };
  };

  const getItemStatus = (item: InventoryItem) => {
    const sequence = getCountingSequence(item);
    
    if (sequence.completed.length === 0) return "pending";
    if (sequence.nextRequired) return "in-progress";
    return "completed";
  };

  const getProductName = (productId: number) => {
    return products?.find(p => p.id === productId)?.name || `Product ${productId}`;
  };

  const getLocationName = (locationId: number) => {
    return locations?.find(l => l.id === locationId)?.name || `Location ${locationId}`;
  };

  const filteredItems = inventoryItems?.filter(item => {
    const productName = getProductName(item.productId);
    const locationName = getLocationName(item.locationId);
    const itemStatus = getItemStatus(item);
    
    const matchesSearch = searchTerm === "" || 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLocation = locationFilter === "all" || item.locationId.toString() === locationFilter;
    const matchesStatus = statusFilter === "all" || itemStatus === statusFilter;
    
    return matchesSearch && matchesLocation && matchesStatus;
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

  const handleCountUpdate = () => {
    refetchItems();
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
          <h1 className="text-3xl font-bold">Contagem de Inventário</h1>
          <p className="text-muted-foreground">
            {inventory?.code} - {inventory?.description}
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredItems.filter(item => getItemStatus(item) === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredItems.filter(item => getItemStatus(item) === "in-progress").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredItems.filter(item => getItemStatus(item) === "completed").length}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Counting Items */}
      <div className="space-y-6">
        {filteredItems.map((item) => {
          const sequence = getCountingSequence(item);
          const status = getItemStatus(item);
          
          return (
            <Card key={item.id} className="p-6">
              <div className="space-y-4">
                {/* Item Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {getProductName(item.productId)}
                    </h3>
                    <p className="text-muted-foreground">
                      Local: {getLocationName(item.locationId)} • 
                      Estoque: {item.expectedQuantity} unidades
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {getStatusLabel(status)}
                    </Badge>
                    {status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {status === "in-progress" && item.difference && Math.abs(item.difference) > 0 && (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </div>

                {/* Counting Stages */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CountingStageCard
                    itemId={item.id}
                    stage={1}
                    currentCount={item.count1}
                    countedBy={item.count1By}
                    countedAt={item.count1At}
                    expectedQuantity={item.expectedQuantity}
                    isDisabled={false}
                    onCountUpdate={handleCountUpdate}
                  />
                  
                  <CountingStageCard
                    itemId={item.id}
                    stage={2}
                    currentCount={item.count2}
                    countedBy={item.count2By}
                    countedAt={item.count2At}
                    expectedQuantity={item.expectedQuantity}
                    isDisabled={!sequence.completed.includes(1) || (sequence.nextRequired !== 2 && !sequence.completed.includes(2))}
                    onCountUpdate={handleCountUpdate}
                  />
                  
                  <CountingStageCard
                    itemId={item.id}
                    stage={3}
                    currentCount={item.count3}
                    countedBy={item.count3By}
                    countedAt={item.count3At}
                    expectedQuantity={item.expectedQuantity}
                    isDisabled={!sequence.completed.includes(2) || (sequence.nextRequired !== 3 && !sequence.completed.includes(3))}
                    onCountUpdate={handleCountUpdate}
                  />
                  
                  <CountingStageCard
                    itemId={item.id}
                    stage={4}
                    currentCount={item.count4}
                    countedBy={item.count4By}
                    countedAt={item.count4At}
                    expectedQuantity={item.expectedQuantity}
                    isDisabled={!sequence.completed.includes(3) || (sequence.nextRequired !== 4 && !sequence.completed.includes(4))}
                    onCountUpdate={handleCountUpdate}
                  />
                </div>

                {/* Summary */}
                {item.finalQuantity !== undefined && (
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Quantidade Final: </span>
                        <span className="text-lg font-bold">{item.finalQuantity}</span>
                      </div>
                      <div>
                        <span className="font-medium">Diferença: </span>
                        <span className={`font-bold ${
                          item.difference && item.difference > 0 ? 'text-red-600' : 
                          item.difference && item.difference < 0 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {item.difference && item.difference > 0 ? '+' : ''}{item.difference || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Acuracidade: </span>
                        <span className="font-bold">
                          {item.accuracy ? `${item.accuracy.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum item encontrado com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}