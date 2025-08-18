import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, InventorySerialItem, Product, Location } from "@shared/schema";

interface AuditDiscrepancy {
  productId: number;
  locationId: number;
  productName: string;
  locationName: string;
  manualCount: number;
  serialCount: number;
  difference: number;
  serialItems: InventorySerialItem[];
}

export default function InventoryAudit() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<AuditDiscrepancy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<AuditDiscrepancy | null>(null);

  useEffect(() => {
    if (id) {
      loadAuditData();
    }
  }, [id]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do inventário
      const [inventoryRes, productsRes, locationsRes] = await Promise.all([
        fetch(`/api/inventories/${id}`),
        fetch("/api/products"),
        fetch("/api/locations")
      ]);

      const inventoryData = await inventoryRes.json();
      const productsData = await productsRes.json();
      const locationsData = await locationsRes.json();

      setInventory(inventoryData);
      setProducts(productsData);
      setLocations(locationsData);

      // Carregar itens do inventário e números de série
      const [itemsRes, serialsRes] = await Promise.all([
        fetch(`/api/inventories/${id}/items`),
        fetch(`/api/inventories/${id}/serial-items`)
      ]);

      const items: InventoryItem[] = await itemsRes.json();
      const serials: InventorySerialItem[] = await serialsRes.json();

      // Calcular discrepâncias
      const discrepanciesList = calculateDiscrepancies(items, serials, productsData, locationsData);
      setDiscrepancies(discrepanciesList);

    } catch (error) {
      console.error("Erro ao carregar dados de auditoria:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de auditoria",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscrepancies = (
    items: InventoryItem[],
    serials: InventorySerialItem[],
    products: Product[],
    locations: Location[]
  ): AuditDiscrepancy[] => {
    const discrepanciesList: AuditDiscrepancy[] = [];

    // Agrupar números de série por produto e local
    const serialsByProductLocation = serials.reduce((acc, serial) => {
      const key = `${serial.productId}-${serial.locationId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(serial);
      return acc;
    }, {} as Record<string, InventorySerialItem[]>);

    // Verificar cada item do inventário
    items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const location = locations.find(l => l.id === item.locationId);
      
      if (!product || !location) return;

      const key = `${item.productId}-${item.locationId}`;
      const itemSerials = serialsByProductLocation[key] || [];
      
      // Contar números de série encontrados (com finalStatus = 1)
      const serialCount = itemSerials.filter(s => s.finalStatus === 1).length;
      
      // Obter contagem manual (usar a contagem mais recente disponível)
      const manualCount = getCurrentCount(item);
      
      // Se há discrepância, adicionar à lista
      if (manualCount !== serialCount) {
        discrepanciesList.push({
          productId: item.productId,
          locationId: item.locationId,
          productName: product.name,
          locationName: location.name,
          manualCount,
          serialCount,
          difference: manualCount - serialCount,
          serialItems: itemSerials
        });
      }
    });

    return discrepanciesList.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  };

  const getCurrentCount = (item: InventoryItem): number => {
    // Retornar a contagem mais recente disponível
    if (item.count4 !== undefined && item.count4 !== null) return item.count4;
    if (item.count3 !== undefined && item.count3 !== null) return item.count3;
    if (item.count2 !== undefined && item.count2 !== null) return item.count2;
    if (item.count1 !== undefined && item.count1 !== null) return item.count1;
    return 0;
  };

  const getSeverityLevel = (difference: number): "low" | "medium" | "high" => {
    const abs = Math.abs(difference);
    if (abs <= 1) return "low";
    if (abs <= 5) return "medium";
    return "high";
  };

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low": return "bg-yellow-100 text-yellow-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "high": return "bg-red-100 text-red-800";
    }
  };

  const filteredDiscrepancies = discrepancies.filter(disc => {
    const matchesSearch = searchTerm === "" ||
      disc.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disc.locationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === "all" ||
      disc.locationId.toString() === locationFilter;
    
    const severity = getSeverityLevel(disc.difference);
    const matchesSeverity = severityFilter === "all" || severity === severityFilter;

    return matchesSearch && matchesLocation && matchesSeverity;
  });

  const reconcileSerial = async () => {
    try {
      const response = await fetch(`/api/inventories/${id}/reconcile-serial`, {
        method: "POST"
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Reconciliação de números de série executada com sucesso",
        });
        // Recarregar dados
        loadAuditData();
      } else {
        throw new Error("Falha na reconciliação");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao executar reconciliação de números de série",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando dados de auditoria...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation('/inventories')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Inventário</h1>
          <p className="text-gray-600">
            {inventory?.name} - Validação de Quantidades vs Números de Série
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {discrepancies.length}
            </div>
            <div className="text-sm text-gray-600">Discrepâncias Encontradas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {discrepancies.filter(d => getSeverityLevel(d.difference) === "high").length}
            </div>
            <div className="text-sm text-gray-600">Críticas (&gt;5)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {discrepancies.filter(d => getSeverityLevel(d.difference) === "medium").length}
            </div>
            <div className="text-sm text-gray-600">Moderadas (2-5)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {discrepancies.filter(d => getSeverityLevel(d.difference) === "low").length}
            </div>
            <div className="text-sm text-gray-600">Menores (≤1)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Discrepâncias Identificadas</CardTitle>
            <Button onClick={reconcileSerial}>
              Executar Reconciliação
            </Button>
          </div>
          
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produto ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Locais</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Severidades</SelectItem>
                <SelectItem value="high">Críticas</SelectItem>
                <SelectItem value="medium">Moderadas</SelectItem>
                <SelectItem value="low">Menores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDiscrepancies.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma discrepância encontrada</p>
              <p className="text-gray-600">Todas as contagens estão alinhadas com os números de série</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDiscrepancies.map((disc, index) => {
                const severity = getSeverityLevel(disc.difference);
                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedDiscrepancy(disc)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{disc.productName}</h3>
                          <Badge variant="outline">{disc.locationName}</Badge>
                          <Badge className={getSeverityColor(severity)}>
                            {severity === "high" ? "Crítica" : severity === "medium" ? "Moderada" : "Menor"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Contagem Manual:</span>
                            <span className="ml-2 font-medium">{disc.manualCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Números de Série:</span>
                            <span className="ml-2 font-medium">{disc.serialCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Diferença:</span>
                            <span className={`ml-2 font-medium ${
                              disc.difference > 0 ? "text-red-600" : "text-blue-600"
                            }`}>
                              {disc.difference > 0 ? "+" : ""}{disc.difference}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {disc.difference > 0 ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDiscrepancy && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Detalhes: {selectedDiscrepancy.productName} - {selectedDiscrepancy.locationName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="serials">Números de Série</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Contagem Manual</h4>
                    <div className="text-2xl font-bold">{selectedDiscrepancy.manualCount}</div>
                  </div>
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Números de Série Encontrados</h4>
                    <div className="text-2xl font-bold">{selectedDiscrepancy.serialCount}</div>
                  </div>
                </div>
                <div className="p-4 border rounded">
                  <h4 className="font-medium mb-2">Análise da Discrepância</h4>
                  <p className="text-gray-600">
                    {selectedDiscrepancy.difference > 0
                      ? `Há ${selectedDiscrepancy.difference} unidade(s) a mais na contagem manual do que números de série encontrados. Isso pode indicar produtos sem controle de série ou números de série não lidos.`
                      : `Há ${Math.abs(selectedDiscrepancy.difference)} número(s) de série a mais do que a contagem manual. Isso pode indicar contagem insuficiente ou números de série duplicados.`
                    }
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="serials">
                <div className="space-y-2">
                  <h4 className="font-medium">Números de Série ({selectedDiscrepancy.serialItems.length})</h4>
                  <div className="max-h-64 overflow-y-auto">
                    {selectedDiscrepancy.serialItems.map((serial, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="font-mono">{serial.serialNumber}</span>
                        <Badge variant={serial.finalStatus === 1 ? "default" : "secondary"}>
                          {serial.finalStatus === 1 ? "Encontrado" : "Pendente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}