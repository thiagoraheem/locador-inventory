import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProductForm from "@/components/product-form";
import DataTable from "@/components/data-table";
import { Plus, Search, Edit, Eye, Trash2, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Product } from "@shared/schema";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/products/${id}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Sucesso",
        description: "Produto reativado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao reativar produto",
        variant: "destructive",
      });
    },
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
      cell: (value: string) => value || "Sem categoria",
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
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: Product) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedProduct(row);
              setIsFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {row.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(row.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reactivateMutation.mutate(row.id)}
              disabled={reactivateMutation.isPending}
              className="text-green-600 hover:text-green-700"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
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
    <div>
      <Header title="Produtos" subtitle="Gerenciamento de produtos do estoque" />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Lista de Produtos</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    placeholder="Filtrar produtos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedProduct(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedProduct ? "Editar Produto" : "Novo Produto"}
                      </DialogTitle>
                    </DialogHeader>
                    <ProductForm
                      product={selectedProduct}
                      onSuccess={() => {
                        setIsFormOpen(false);
                        setSelectedProduct(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-gray-600">
                Mostrar produtos desativados
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={products || []}
              columns={columns}
              searchQuery={searchQuery}
              isLoading={productsLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
