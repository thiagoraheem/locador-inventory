import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/data-table";
import CategoryFilter from "@/components/category-filter";
import { Search, Eye, Package2 } from "lucide-react";
import type { StockItem } from "@shared/schema";

export default function StockItems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  const { data: stockItems, isLoading: stockItemsLoading } = useQuery({
    queryKey: ["/api/stock-items", searchQuery, showInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showInactive) params.set('includeInactive', 'true');
      
      const response = await fetch(`/api/stock-items?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const filteredStockItems = useMemo(() => {
    if (!stockItems) return [];
    
    let filtered = stockItems;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => 
        item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    return filtered;
  }, [stockItems, selectedCategory]);

  const columns = [
    {
      header: "SKU/Tag",
      accessorKey: "assetTag",
      sortable: true,
    },
    {
      header: "Descrição",
      accessorKey: "description",
      sortable: true,
    },
    {
      header: "Categoria",
      accessorKey: "category",
      sortable: true,
      cell: (value: string) => value || "Sem categoria",
    },
    {
      header: "Localização",
      accessorKey: "location",
      sortable: true,
      cell: (value: any, row: StockItem) => {
        if (row.locationCode && row.location) {
          return `${row.locationCode} - ${row.location}`;
        }
        return value || "Não informado";
      },
    },
    {
      header: "Quantidade",
      accessorKey: "quantity",
      sortable: true,
      cell: (value: number) => value || 0,
    },
    {
      header: "SKU/Série",
      accessorKey: "serialNumber",
      sortable: true,
      cell: (value: string) => value || "Não informado",
    },
    {
      header: "Valor de Custo",
      accessorKey: "costValue",
      sortable: true,
      cell: (value: number) => {
        if (value == null) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      },
    },
    {
      header: "Valor Atual",
      accessorKey: "currentValue",
      sortable: true,
      cell: (value: number) => {
        if (value == null) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      },
    },
    {
      header: "Condição",
      accessorKey: "condition",
      sortable: true,
      cell: (value: string) => (
        <Badge variant={value === "Bom" ? "default" : value === "Regular" ? "secondary" : "destructive"}>
          {value || "Não informado"}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (stockItemsLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Header title="Controle de Patrimônio" subtitle="Visualização de itens patrimoniais (somente leitura)" />
        <div className="space-y-6">
          <Card className="mobile-card">
            <CardContent className="p-4 sm:p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Header title="Controle de Patrimônio" subtitle="Visualização de itens patrimoniais (somente leitura)" />
      
      <div className="space-y-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Esta tela é somente para visualização. Os dados de patrimônio são gerenciados externamente.
          </AlertDescription>
        </Alert>
        
        <Card className="mobile-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center">
                <Package2 className="h-5 w-5 mr-2" />
                Lista de Itens Patrimoniais
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  placeholder="Filtrar por categoria"
                />
                <div className="relative">
                  <Input
                    placeholder="Filtrar itens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-gray-600 text-responsive">
                Mostrar itens inativos
              </Label>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="table-container">
              <DataTable
                data={filteredStockItems || []}
                columns={columns}
                searchQuery={searchQuery}
                isLoading={stockItemsLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}