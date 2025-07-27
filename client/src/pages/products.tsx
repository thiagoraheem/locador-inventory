import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/data-table";
import { Search, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Product } from "@shared/schema";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
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

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", searchQuery, showInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showInactive) params.set('includeInactive', 'true');
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });



  const columns = [
    {
      header: "SKU",
      accessorKey: "sku",
      sortable: true,
    },
    {
      header: "Nome do Produto",
      accessorKey: "name",
      sortable: true,
    },
    {
      header: "Categoria",
      accessorKey: "category",
      sortable: true,
      cell: (value: any) => {
        if (typeof value === 'string') {
          return value || "Sem categoria";
        }
        if (value && typeof value === 'object' && value.name) {
          return value.name;
        }
        return "Sem categoria";
      },
    },
    {
      header: "Valor do Bem",
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
      header: "Status",
      accessorKey: "isActive",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },

  ];

  if (productsLoading) {
    return (
      <div>
        <Header title="Produtos" subtitle="Gerenciamento de produtos do estoque" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
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
      <Header title="Produtos" subtitle="Visualização de produtos do estoque (somente leitura)" />
      
      <div className="space-y-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Esta tela é somente para visualização. Os dados de produtos são gerenciados externamente.
          </AlertDescription>
        </Alert>
        
        <Card className="mobile-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle>Lista de Produtos</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    placeholder="Filtrar produtos..."
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
                Mostrar produtos desativados
              </Label>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="table-container">
              <DataTable
                data={products || []}
                columns={columns}
                searchQuery={searchQuery}
                isLoading={productsLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
