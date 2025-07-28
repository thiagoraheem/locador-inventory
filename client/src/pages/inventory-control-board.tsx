import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Download, Clock, Package, TrendingUp, Target } from "lucide-react";
import type { Inventory, InventoryItem, Product, Location, Category, ControlPanelStats } from "@shared/schema";

interface InventoryControlBoardProps {
  params: { id: string };
}

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
  count?: number;
  countBy?: string;
  countAt?: number;
  stage: 'C1' | 'C2' | 'C3' | 'C4';
}

const CountIndicator = ({ count, countBy, countAt, stage }: CountIndicatorProps) => {
  const hasCount = count !== undefined && count !== null;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge 
        variant={hasCount ? "default" : "outline"}
        className={`text-xs ${hasCount ? 'bg-green-500' : ''}`}
      >
        {stage}
      </Badge>
      {hasCount ? (
        <div className="text-center">
          <div className="font-bold text-sm">{count}</div>
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

interface AccuracyIndicatorProps {
  accuracy?: number;
  difference?: number;
}

const AccuracyIndicator = ({ accuracy, difference }: AccuracyIndicatorProps) => {
  if (accuracy === undefined) return <span className="text-muted-foreground">-</span>;
  
  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-green-600";
    if (acc >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-bold ${getAccuracyColor(accuracy)}`}>
        {accuracy.toFixed(1)}%
      </span>
      {difference !== undefined && (
        <span className="text-xs text-muted-foreground">
          Δ {difference}
        </span>
      )}
    </div>
  );
};

export default function InventoryControlBoard({ params }: InventoryControlBoardProps) {
  const inventoryId = parseInt(params.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startTime, setStartTime] = useState<number>(Date.now());

  const { data: inventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${inventoryId}`],
  });

  const { data: stats } = useQuery<ControlPanelStats>({
    queryKey: [`/api/inventories/${inventoryId}/stats`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${inventoryId}/items`],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  useEffect(() => {
    if (inventory?.startDate) {
      setStartTime(inventory.startDate);
    }
  }, [inventory]);

  const getElapsedTime = () => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getInventoriedPercentage = () => {
    if (!stats) return 0;
    const total = stats.itemsInProgress + stats.itemsCompleted;
    return total > 0 ? (stats.itemsCompleted / total) * 100 : 0;
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
    
    const matchesSearch = searchTerm === "" || 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleExport = () => {
    // Implement export functionality
    console.log("Export functionality to be implemented");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with KPIs */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Mesa de Controle</h1>
            <p className="text-muted-foreground">
              Inventário: {inventory?.code} - Status: {inventory?.status}
            </p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Produtos"
            value={stats?.itemsInProgress + stats?.itemsCompleted || 0}
            description="Total de itens"
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />
          <KPICard
            title="Categorias"
            value={categories?.length || 0}
            description="Categorias ativas"
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
          />
          <KPICard
            title="Inventariado"
            value={`${getInventoriedPercentage().toFixed(1)}%`}
            description={`${stats?.itemsCompleted || 0} de ${(stats?.itemsInProgress || 0) + (stats?.itemsCompleted || 0)} itens`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            trend="up"
          />
          <KPICard
            title="Tempo Decorrido"
            value={getElapsedTime()}
            description="Desde o início"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={getInventoriedPercentage()} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Acuracidade Média: {stats?.accuracyRate.toFixed(1)}%</span>
              <span>Divergências: {stats?.divergenceCount || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Controle de Itens</CardTitle>
          <CardDescription>
            Acompanhe o progresso de contagem por item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto ou local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
                <SelectItem value="DIVERGENT">Divergente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Local de Estoque</TableHead>
                  <TableHead>Qtd. Estoque</TableHead>
                  <TableHead className="text-center">C1</TableHead>
                  <TableHead className="text-center">C2</TableHead>
                  <TableHead className="text-center">C3</TableHead>
                  <TableHead className="text-center">C4</TableHead>
                  <TableHead>Qtd. Final</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Acuracidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {getProductName(item.productId)}
                    </TableCell>
                    <TableCell>{getLocationName(item.locationId)}</TableCell>
                    <TableCell>{item.expectedQuantity}</TableCell>
                    <TableCell>
                      <CountIndicator
                        count={item.count1}
                        countBy={item.count1By}
                        countAt={item.count1At}
                        stage="C1"
                      />
                    </TableCell>
                    <TableCell>
                      <CountIndicator
                        count={item.count2}
                        countBy={item.count2By}
                        countAt={item.count2At}
                        stage="C2"
                      />
                    </TableCell>
                    <TableCell>
                      <CountIndicator
                        count={item.count3}
                        countBy={item.count3By}
                        countAt={item.count3At}
                        stage="C3"
                      />
                    </TableCell>
                    <TableCell>
                      <CountIndicator
                        count={item.count4}
                        countBy={item.count4By}
                        countAt={item.count4At}
                        stage="C4"
                      />
                    </TableCell>
                    <TableCell>
                      {item.finalQuantity !== undefined ? (
                        <span className="font-bold">{item.finalQuantity}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.difference !== undefined ? (
                        <span className={item.difference > 0 ? "text-red-600" : "text-green-600"}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AccuracyIndicator
                        accuracy={item.accuracy}
                        difference={item.difference}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer with Totals */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total de Itens: </span>
                <span>{filteredItems.length}</span>
              </div>
              <div>
                <span className="font-medium">Concluídos: </span>
                <span>{filteredItems.filter(item => item.finalQuantity !== undefined).length}</span>
              </div>
              <div>
                <span className="font-medium">Divergências: </span>
                <span className="text-red-600">
                  {filteredItems.filter(item => item.difference && item.difference > 0).length}
                </span>
              </div>
              <div>
                <span className="font-medium">Acuracidade Média: </span>
                <span className="font-bold">
                  {stats?.accuracyRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}