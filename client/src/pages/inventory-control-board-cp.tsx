import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/header";
import { Search, Filter, Download, Clock, Package, TrendingUp, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Inventory, InventorySerialItem, Product, Location, Category, ControlPanelStats } from "@shared/schema";

interface KPICardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
}

const KPICard = ({ title, value, description, icon, trend }: KPICardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {trend && (
          <TrendingUp className={`h-3 w-3 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`} />
        )}
        {description}
      </p>
    </CardContent>
  </Card>
);

interface CountIndicatorProps {
  found?: boolean;
  countBy?: string;
  countAt?: number;
  stage: 'C1' | 'C2' | 'C3' | 'C4';
}

const CountIndicator = ({ found, countBy, countAt, stage }: CountIndicatorProps) => {
  const hasCount = found !== undefined;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge 
        variant={hasCount ? "default" : "outline"}
        className={`text-xs ${found ? 'bg-green-500' : hasCount ? 'bg-red-500' : ''}`}
      >
        {stage}
      </Badge>
      {hasCount ? (
        <div className="text-center">
          <div className="font-bold text-sm">{found ? 'Encontrado' : 'Não Encontrado'}</div>
          {countBy && (
            <div className="text-xs text-muted-foreground">
              {countBy}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Pendente</div>
      )}
    </div>
  );
};

interface FinalResultIndicatorProps {
  finalStatus?: boolean;
  status: string;
}

const FinalResultIndicator = ({ finalStatus, status }: FinalResultIndicatorProps) => {
  if (finalStatus === undefined) return <span className="text-muted-foreground">-</span>;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FOUND': return "text-green-600";
      case 'MISSING': return "text-red-600";
      case 'EXTRA': return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-bold ${getStatusColor(status)}`}>
        {finalStatus ? 'Encontrado' : 'Não Encontrado'}
      </span>
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    </div>
  );
};

export default function InventoryControlBoardCP() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: selectedInventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${selectedInventoryId}`],
    enabled: !!selectedInventoryId,
  });

  const { data: serialItems } = useQuery<InventorySerialItem[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/serial-items`],
    enabled: !!selectedInventoryId,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const getProductBySku = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product ? `${product.sku} - ${product.name}` : `Product ${productId}`;
  };

  const getLocationName = (locationId: number) => {
    return locations?.find(l => l.id === locationId)?.name || `Location ${locationId}`;
  };

  const filteredItems = serialItems?.filter(item => {
    const productSku = getProductBySku(item.productId);
    const locationName = getLocationName(item.locationId);
    
    const matchesSearch = searchTerm === "" || 
      productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  })?.sort((a, b) => {
    // Ordenação: primeiro pela descrição do produto, depois pelo número de série
    const productA = products?.find(p => p.id === a.productId)?.name || '';
    const productB = products?.find(p => p.id === b.productId)?.name || '';
    
    if (productA !== productB) {
      return productA.localeCompare(productB);
    }
    
    return a.serialNumber.localeCompare(b.serialNumber);
  }) || [];

  const handleExport = () => {
    console.log("Export functionality to be implemented");
  };

  const getSerialStatsForInventory = () => {
    if (!serialItems) return { total: 0, found: 0, missing: 0, pending: 0 };
    
    const total = serialItems.length;
    const found = serialItems.filter(item => item.status === 'FOUND').length;
    const missing = serialItems.filter(item => item.status === 'MISSING').length;
    const pending = serialItems.filter(item => item.status === 'PENDING').length;
    
    return { total, found, missing, pending };
  };

  const stats = getSerialStatsForInventory();
  const completionPercentage = stats.total > 0 ? ((stats.found + stats.missing) / stats.total) * 100 : 0;

  return (
    <div>
      <Header 
        title="Mesa de Controle CP" 
        subtitle="Controle centralizado de contagens por número de série (Controle de Patrimônio)" 
      />
      
      <div className="space-y-6">
        {/* Inventory Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Inventário</CardTitle>
            <CardDescription>
              Escolha um inventário para visualizar as contagens por número de série
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select value={selectedInventoryId?.toString() || ""} onValueChange={(value) => setSelectedInventoryId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um inventário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventories?.filter(inventory => inventory.id).map((inventory) => (
                      <SelectItem key={inventory.id} value={inventory.id.toString()}>
                        {inventory.code} - {inventory.description || 'Sem descrição'} ({inventory.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedInventoryId && selectedInventory ? (
          <>
            {/* Header with KPIs */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Inventário: {selectedInventory.code}</h2>
                  <p className="text-muted-foreground">
                    Status: <Badge variant="outline">{selectedInventory.status}</Badge>
                  </p>
                </div>
                <Button onClick={handleExport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Relatório
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total de Itens CP"
                  value={stats.total}
                  description="Itens com controle de patrimônio"
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KPICard
                  title="Encontrados"
                  value={stats.found}
                  description="Itens encontrados nas contagens"
                  icon={<Target className="h-4 w-4 text-muted-foreground" />}
                />
                <KPICard
                  title="Não Encontrados"
                  value={stats.missing}
                  description="Itens não encontrados"
                  icon={<Target className="h-4 w-4 text-muted-foreground" />}
                />
                <KPICard
                  title="Progresso"
                  value={`${completionPercentage.toFixed(1)}%`}
                  description={`${stats.found + stats.missing} de ${stats.total} verificados`}
                  icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                  trend="up"
                />
              </div>

              {/* Progress Bar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Progresso das Contagens</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={completionPercentage} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Encontrados: {stats.found}</span>
                    <span>Não Encontrados: {stats.missing}</span>
                    <span>Pendentes: {stats.pending}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle>Controle de Itens por Número de Série</CardTitle>
                <CardDescription>
                  Acompanhe o progresso de contagem por código de patrimônio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por produto, CP ou local..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="FOUND">Encontrado</SelectItem>
                      <SelectItem value="MISSING">Não Encontrado</SelectItem>
                      <SelectItem value="EXTRA">Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU/Produto</TableHead>
                        <TableHead>CP (Código de Patrimônio)</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>C1</TableHead>
                        <TableHead>C2</TableHead>
                        <TableHead>C3</TableHead>
                        <TableHead>C4</TableHead>
                        <TableHead>Resultado Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {getProductBySku(item.productId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.serialNumber}</Badge>
                          </TableCell>
                          <TableCell>{getLocationName(item.locationId)}</TableCell>
                          <TableCell>
                            <CountIndicator
                              found={item.count1_found}
                              countBy={item.count1_by}
                              countAt={item.count1_at}
                              stage="C1"
                            />
                          </TableCell>
                          <TableCell>
                            <CountIndicator
                              found={item.count2_found}
                              countBy={item.count2_by}
                              countAt={item.count2_at}
                              stage="C2"
                            />
                          </TableCell>
                          <TableCell>
                            <CountIndicator
                              found={item.count3_found}
                              countBy={item.count3_by}
                              countAt={item.count3_at}
                              stage="C3"
                            />
                          </TableCell>
                          <TableCell>
                            <CountIndicator
                              found={item.count4_found}
                              countBy={item.count4_by}
                              countAt={item.count4_at}
                              stage="C4"
                            />
                          </TableCell>
                          <TableCell>
                            <FinalResultIndicator
                              finalStatus={item.finalStatus}
                              status={item.status}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado com os filtros aplicados.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione um Inventário</h3>
              <p className="text-muted-foreground">
                Escolha um inventário acima para visualizar as informações na Mesa de Controle CP
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}