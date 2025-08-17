import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { useShowMoney } from "@/contexts/ShowMoneyContext";
import { ItemsTableProps, DashboardItem, ItemStatus } from "../../../../shared/dashboard-types";

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  title = "Itens do Inventário",
  showFilters = true,
  showPagination = true,
  showExport = true,
  pageSize = 10,
  loading = false,
  onItemClick,
  onExport,
  className
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<keyof DashboardItem>("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get unique locations for filter
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(items.map(item => item.locationName))];
    return uniqueLocations.sort();
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = 
        (item.productSku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesLocation = locationFilter === "all" || item.locationName === locationFilter;
      
      return matchesSearch && matchesStatus && matchesLocation;
    });

    // Sort items
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [items, searchTerm, statusFilter, locationFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter]);

  const handleSort = (column: keyof DashboardItem) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case "counted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "divergent":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "not_found":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    const variants = {
      counted: "default",
      pending: "secondary",
      divergent: "destructive",
      not_found: "destructive"
    } as const;

    const labels = {
      counted: "Contado",
      pending: "Pendente",
      divergent: "Divergente",
      not_found: "Não Encontrado"
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  const getDivergenceIcon = (divergence?: number) => {
    if (!divergence || divergence === 0) return null;
    
    return divergence > 0 
      ? <TrendingUp className="h-4 w-4 text-green-600" />
      : <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const { showMoney } = useShowMoney();
   
   const formatCurrencyValue = (value: number) => {
     return new Intl.NumberFormat('pt-BR', {
       style: 'currency',
       currency: 'BRL'
     }).format(value);
   };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <Skeleton className="h-4 sm:h-5 w-36 sm:w-48" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            {showFilters && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Skeleton className="h-8 sm:h-9 w-full sm:w-64" />
                <Skeleton className="h-8 sm:h-9 w-full sm:w-32" />
                <Skeleton className="h-8 sm:h-9 w-full sm:w-32" />
              </div>
            )}
            
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-2 sm:space-x-4">
                      <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 flex-shrink-0" />
                      <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 flex-1" />
                      <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 flex-shrink-0" />
                      <Skeleton className="h-3 sm:h-4 w-12 sm:w-20 flex-shrink-0" />
                      <Skeleton className="h-3 sm:h-4 w-10 sm:w-16 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {showPagination && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                <div className="flex space-x-1 sm:space-x-2">
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8" />
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">{title}</CardTitle>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <Badge variant="outline" size="sm" className="text-xs">
              {filteredItems.length} itens
            </Badge>
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.(filteredItems)}
                className="text-xs"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Export</span>
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3 sm:mt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ItemStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="counted">Contado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="divergent">Divergente</SelectItem>
                <SelectItem value="not_found">Não Encontrado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Localização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Localizações</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="rounded-md border overflow-auto max-h-[300px] sm:max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm"
                  onClick={() => handleSort("productSku")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Código</span>
                    {sortBy === "productSku" && (
                      sortOrder === "asc" ? 
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" /> : 
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm"
                  onClick={() => handleSort("productName")}
                >
                  <div className="flex items-center space-x-1">
                    <span className="hidden sm:inline">Descrição</span>
                    <span className="sm:hidden">Desc.</span>
                    {sortBy === "productName" && (
                      sortOrder === "asc" ? 
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" /> : 
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm hidden sm:table-cell"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Localização</span>
                    {sortBy === "location" && (
                      sortOrder === "asc" ? 
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" /> : 
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Qtd. Sistema</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Qtd. Contada</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden lg:table-cell">Divergência</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden lg:table-cell">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Valor Unit.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle show money functionality would be handled by context
                      }}
                    >
                      {showMoney ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                  </div>
                </TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                <TableHead className="w-[30px] sm:w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    item.status === "divergent" && "bg-red-50 hover:bg-red-100",
                    item.status === "not_found" && "bg-red-50 hover:bg-red-100"
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  <TableCell className="font-medium text-xs sm:text-sm">{item.productSku}</TableCell>
                  <TableCell className="max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm" title={item.productName}>
                    {item.productName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{item.locationName}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">{item.expectedQty}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                    {item.finalQty ?? "-"}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <div className="flex items-center justify-end space-x-1">
                      {item.divergence?.quantity !== undefined && item.divergence.quantity !== 0 && (
                        <>
                          {getDivergenceIcon(item.divergence.quantity)}
                          <span className={cn(
                            "text-xs sm:text-sm font-medium",
                            item.divergence.quantity > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {item.divergence.quantity > 0 ? "+" : ""}{item.divergence.quantity}
                          </span>
                        </>
                      )}
                      {(!item.divergence?.quantity || item.divergence.quantity === 0) && (
                        <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">
                    {showMoney ? formatCurrencyValue(item.costValue) : "***"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {getStatusIcon(item.status)}
                      <div className="hidden sm:block">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick?.(item);
                      }}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {showPagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 mt-3 sm:mt-4">
            <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
              <span className="hidden sm:inline">
                Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, filteredItems.length)} de {filteredItems.length} itens
              </span>
              <span className="sm:hidden">
                {startIndex + 1}-{Math.min(startIndex + pageSize, filteredItems.length)} de {filteredItems.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 sm:h-8 px-2 sm:px-3"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                
                {totalPages > 3 && (
                  <>
                    <span className="text-muted-foreground text-xs sm:text-sm">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 sm:h-8 px-2 sm:px-3"
              >
                <span className="hidden sm:inline mr-1">Próximo</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized table variants
export const DivergentItemsTable: React.FC<{
  items: DashboardItem[];
  loading?: boolean;
  onItemClick?: (item: DashboardItem) => void;
  className?: string;
}> = ({ items, loading, onItemClick, className }) => {
  const divergentItems = items.filter(item => item.status === "divergent");
  
  return (
    <ItemsTable
      items={divergentItems}
      title="Itens com Divergência"
      showFilters={false}
      pageSize={5}
      loading={loading}
      onItemClick={onItemClick}
      className={className}
    />
  );
};

export const PendingItemsTable: React.FC<{
  items: DashboardItem[];
  loading?: boolean;
  onItemClick?: (item: DashboardItem) => void;
  className?: string;
}> = ({ items, loading, onItemClick, className }) => {
  const pendingItems = items.filter(item => item.status === "pending");
  
  return (
    <ItemsTable
      items={pendingItems}
      title="Itens Pendentes"
      showFilters={false}
      pageSize={5}
      loading={loading}
      onItemClick={onItemClick}
      className={className}
    />
  );
};

export const HighValueItemsTable: React.FC<{
  items: DashboardItem[];
  minValue?: number;
  loading?: boolean;
  onItemClick?: (item: DashboardItem) => void;
  className?: string;
}> = ({ items, minValue = 1000, loading, onItemClick, className }) => {
  const highValueItems = items
    .filter(item => item.unitValue >= minValue)
    .sort((a, b) => b.unitValue - a.unitValue);
  
  return (
    <ItemsTable
      items={highValueItems}
      title={`Itens de Alto Valor (> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minValue)})`}
      showFilters={false}
      pageSize={5}
      loading={loading}
      onItemClick={onItemClick}
      className={className}
    />
  );
};

export default ItemsTable;