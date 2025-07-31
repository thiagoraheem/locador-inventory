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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/data-table";
import CategoryFilter from "@/components/category-filter";
import { Search, Eye, Package2 } from "lucide-react";
import type { StockItem, Location } from "@shared/schema";

export default function StockItems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, active, inactive
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
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
    queryKey: ["/api/stock-items"],
    queryFn: async () => {
      const response = await fetch("/api/stock-items");
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const filteredStockItems = useMemo(() => {
    if (!stockItems) return [];
    
    let filtered = stockItems;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((item: any) =>
        item.assetTag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((item: any) => {
        if (statusFilter === "active") return item.isActive;
        if (statusFilter === "inactive") return !item.isActive;
        return true;
      });
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item: any) => 
        item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter((item: any) => 
        item.location && item.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }
    
    return filtered;
  }, [stockItems, searchQuery, statusFilter, selectedCategory, selectedLocation]);

  const columns = [
    {
      header: "SKU",
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
      cell: (value: any) => value || "Sem categoria",
    },
    {
      header: "Localização",
      accessorKey: "location",
      sortable: true,
      cell: (value: any) => value || "Sem localização",
    },
    {
      header: "Núm. Série",
      accessorKey: "serialNumber",
      sortable: true,
      cell: (value: any) => value || "-",
    },
    {
      header: "Valor Custo",
      accessorKey: "costValue",
      sortable: true,
      cell: (value: any) => {
        if (!value || value === 0) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      },
    },
    {
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
      cell: (value: any) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Controle de Patrimônio" subtitle="Visualização de itens patrimoniais (somente leitura)" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Esta tela é somente para visualização. Os dados são obtidos da tabela stock_items.
          </AlertDescription>
        </Alert>
        
        <Card className="mobile-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle>Lista de Patrimônio</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  placeholder="Filtrar por categoria"
                />
                <div className="flex space-x-2">
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os locais</SelectItem>
                      {locations?.map((location: Location) => (
                        <SelectItem key={location.id} value={location.name}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Input
                    placeholder="Buscar itens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
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