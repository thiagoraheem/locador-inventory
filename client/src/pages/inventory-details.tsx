import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, MapPin, Package, Tags, Search, FileText, BarChart3, Clock, User, ChevronDown, ChevronRight, Expand, Minimize, Archive } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import type { Inventory, InventoryItem, Product, Location, Category, InventorySerialItem } from "@shared/schema";

export default function InventoryDetails() {
  const [, params] = useRoute("/inventories/:id/details");
  const inventoryId = parseInt(params?.id || "0");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Função para alternar expansão de categoria
  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Função para obter estado inicial de expansão
  const getInitialExpansionState = (categoryName: string) => {
    if (expandedCategories.hasOwnProperty(categoryName)) {
      return expandedCategories[categoryName];
    }
    // Por padrão, "Sem categoria" começa colapsada, outras expandidas
    return categoryName !== 'Sem categoria';
  };

  // Função para expandir/colapsar todas as categorias
  const toggleAllCategories = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    sortedCategories.forEach(categoryName => {
      newState[categoryName] = expand;
    });
    setExpandedCategories(newState);
  };

  // Fetch inventory details
  const { data: inventory, isLoading: inventoryLoading } = useQuery<Inventory & { type: any; createdByUser: any }>({
    queryKey: ["/api/inventories", inventoryId],
    enabled: !!inventoryId,
  });

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery<(InventoryItem & { product: Product; location: Location })[]>({
    queryKey: ["/api/inventories", inventoryId, "items"],
    enabled: !!inventoryId,
  });

  // Fetch all locations to map selected ones
  const { data: allLocations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Fetch all categories to map selected ones
  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch serial items for products with serial control
  const { data: serialItems = [] } = useQuery<InventorySerialItem[]>({
    queryKey: ["/api/inventories", inventoryId, "serial-items"],
    enabled: !!inventoryId,
  });

  if (inventoryLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/inventories">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/inventories">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Inventário não encontrado</h1>
        </div>
      </div>
    );
  }

  // Get selected locations and categories
  const selectedLocations = allLocations.filter(loc => 
    inventory.selectedLocationIds?.includes(loc.id)
  );
  
  const selectedCategories = allCategories.filter(cat => 
    inventory.selectedCategoryIds?.includes(cat.id)
  );

  // Filter items based on search
  const filteredItems = inventoryItems.filter(item =>
    (item.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.product?.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.location?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.product?.categoryName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group items by category and sort
  const groupedByCategory = filteredItems.reduce((acc, item) => {
    const categoryName = item.product?.categoryName || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  // Sort categories alphabetically and products within each category
  const sortedCategories = Object.keys(groupedByCategory).sort();
  sortedCategories.forEach(categoryName => {
    groupedByCategory[categoryName].sort((a, b) => 
      (a.product?.name || '').localeCompare(b.product?.name || '')
    );
  });

  // Group serial items by product
  const serialItemsByProduct = serialItems.reduce((acc, item) => {
    if (!acc[item.productId]) acc[item.productId] = [];
    acc[item.productId].push(item);
    return acc;
  }, {} as Record<number, InventorySerialItem[]>);

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'count1_open': 
      case 'count2_open': 
      case 'count3_open': return 'secondary';
      case 'closed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // Status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planejamento';
      case 'open': return 'Aberto';
      case 'count1_open': return '1ª Contagem Aberta';
      case 'count1_closed': return '1ª Contagem Fechada';
      case 'count2_open': return '2ª Contagem Aberta';
      case 'count2_closed': return '2ª Contagem Fechada';
      case 'count3_open': return '3ª Contagem Aberta';
      case 'count3_closed': return '3ª Contagem Fechada';
      case 'audit': return 'Auditoria';
      case 'closed': return 'Fechado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventories">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{inventory.code}</h1>
          <p className="text-muted-foreground">Detalhes do Inventário</p>
        </div>
        <Badge variant={getStatusVariant(inventory.status)} className="text-sm px-3 py-1">
          {getStatusText(inventory.status)}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{inventoryItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locais Selecionados</p>
                <p className="text-2xl font-bold">{selectedLocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Tags className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              <div>
                <p className="text-sm text-muted-foreground">Categorias Selecionadas</p>
                <p className="text-2xl font-bold">{selectedCategories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Números de Série</p>
                <p className="text-2xl font-bold">{serialItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locais
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        {/* Informações Gerais */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dados do Inventário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p className="text-lg font-semibold">{inventory.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p>{inventory.type?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(inventory.status)}>
                      {getStatusText(inventory.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm">{inventory.description || 'Sem descrição'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bloquear Sistema</label>
                  <p className="text-sm">
                    {inventory.isToBlockSystem ? 
                      <Badge variant="destructive">Sim</Badge> : 
                      <Badge variant="outline">Não</Badge>
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cronograma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Início</label>
                  <p className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {new Date(inventory.startDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {inventory.endDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Fim</label>
                    <p className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(inventory.endDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                {inventory.predictedEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previsão de Conclusão</label>
                    <p className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(inventory.predictedEndDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criado Por</label>
                  <p className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {inventory.createdByUser?.username || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criado Em</label>
                  <p className="text-sm">
                    {new Date(inventory.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locais Selecionados */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locais de Estoque Selecionados ({selectedLocations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum local específico selecionado</p>
                  <p className="text-sm">Inventário abrange todos os locais</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedLocations.map((location) => (
                    <Card key={location.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{location.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Código: {location.code}
                            </p>
                            {location.description && (
                              <p className="text-xs text-muted-foreground">
                                {location.description}
                              </p>
                            )}
                            <div className="mt-2">
                              <Badge 
                                variant={location.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {location.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorias Selecionadas */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Categorias de Produtos Selecionadas ({selectedCategories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma categoria específica selecionada</p>
                  <p className="text-sm">Inventário abrange todas as categorias</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCategories.map((category) => (
                    <Card key={category.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Tags className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {category.description}
                              </p>
                            )}
                            <div className="mt-2">
                              <Badge 
                                variant={category.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {category.isActive ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos no Inventário ({filteredItems.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllCategories(true)}
                      className="text-xs"
                    >
                      <Expand className="h-3 w-3 mr-1" />
                      Expandir Todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllCategories(false)}
                      className="text-xs"
                    >
                      <Minimize className="h-3 w-3 mr-1" />
                      Colapsar Todas
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48"></div>
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{searchTerm ? "Nenhum produto encontrado com o termo pesquisado" : "Nenhum produto no inventário"}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedCategories.map((categoryName) => {
                    const categoryItems = groupedByCategory[categoryName];
                    const uniqueProducts = new Set(categoryItems.map(item => item.productId)).size;
                    const isExpanded = getInitialExpansionState(categoryName);
                    
                    return (
                      <Collapsible key={categoryName} open={isExpanded} onOpenChange={() => toggleCategoryExpansion(categoryName)}>
                        <div className="space-y-3">
                          {/* Category Header */}
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors cursor-pointer">
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className={`p-2 rounded-lg ${
                                   categoryName === 'Sem categoria' 
                                     ? 'bg-orange-100 dark:bg-orange-900/30' 
                                     : 'bg-purple-100 dark:bg-purple-900/30'
                                 }`}>
                                   {categoryName === 'Sem categoria' ? (
                                     <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                   ) : (
                                     <Tags className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                   )}
                                 </div>
                                 <div>
                                   <h3 className={`text-lg font-semibold ${
                                     categoryName === 'Sem categoria'
                                       ? 'text-orange-700 dark:text-orange-300'
                                       : ''
                                   }`}>{categoryName}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'itens'} • {uniqueProducts} {uniqueProducts === 1 ? 'produto distinto' : 'produtos distintos'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-sm px-3 py-1">
                                {uniqueProducts} {uniqueProducts === 1 ? 'produto' : 'produtos'}
                              </Badge>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            {/* Products Table */}
                            <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead>Qtd. Esperada</TableHead>
                                <TableHead>Números de Série</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryItems.map((item) => {
                                const productSerials = serialItemsByProduct[item.productId] || [];
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{item.product?.name || 'Produto não encontrado'}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {item.product?.description || 'Sem descrição'}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {item.product?.sku || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {item.location?.name || 'Local não encontrado'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {item.expectedQuantity}
                                    </TableCell>
                                    <TableCell>
                                      {productSerials.length > 0 ? (
                                        <div className="space-y-1">
                                          <Badge variant="secondary" className="text-xs">
                                            {productSerials.length} séries
                                          </Badge>
                                          <div className="flex flex-wrap gap-1">
                                            {productSerials.slice(0, 3).map((serial, idx) => (
                                              <Badge key={idx} variant="outline" className="text-xs font-mono">
                                                {serial.serialNumber}
                                              </Badge>
                                            ))}
                                            {productSerials.length > 3 && (
                                              <Badge variant="outline" className="text-xs">
                                                +{productSerials.length - 3} mais
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          Sem controle de série
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={item.status === "PENDING" ? "secondary" : "default"}
                                        className="text-xs"
                                      >
                                        {item.status === "PENDING" ? "Pendente" : item.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                            </div>
                            
                            {/* Category Footer */}
                            <div className="flex justify-end p-3 bg-muted/30 rounded-lg border-t">
                              <div className="text-sm text-muted-foreground">
                                <strong>{uniqueProducts}</strong> {uniqueProducts === 1 ? 'produto distinto' : 'produtos distintos'} nesta categoria
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}