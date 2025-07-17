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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StockForm from "@/components/stock-form";
import DataTable from "@/components/data-table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["/api/stock"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/stock/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      toast({
        title: "Sucesso",
        description: "Item de estoque excluído com sucesso!",
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
        description: "Erro ao excluir item de estoque",
        variant: "destructive",
      });
    },
  });

  const columns = [
    {
      header: "SKU",
      accessorKey: "product",
      sortable: true,
      cell: (value: any) => value?.sku || "N/A",
    },
    {
      header: "Produto",
      accessorKey: "product",
      sortable: true,
      cell: (value: any) => value?.name || "N/A",
    },
    {
      header: "Local",
      accessorKey: "location",
      sortable: true,
      cell: (value: any) => value?.name || "N/A",
    },
    {
      header: "Quantidade",
      accessorKey: "quantity",
      sortable: true,
      cell: (value: string) => parseFloat(value).toLocaleString(),
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: any) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStock(row);
              setIsFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteMutation.mutate(row.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter stock based on search
  const filteredStock = stock?.filter((item: any) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      item.product?.name?.toLowerCase().includes(searchLower) ||
      item.product?.sku?.toLowerCase().includes(searchLower) ||
      item.location?.name?.toLowerCase().includes(searchLower)
    );
  }) || [];

  console.log('Stock data:', stock); // Debug log

  return (
    <div>
      <Header title="Controle de Estoque" subtitle="Associação de produtos com locais de armazenamento" />
      
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens em Estoque</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  placeholder="Filtrar estoque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedStock(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedStock ? "Editar Estoque" : "Novo Item de Estoque"}
                    </DialogTitle>
                  </DialogHeader>
                  <StockForm
                    stock={selectedStock}
                    onSuccess={() => {
                      setIsFormOpen(false);
                      setSelectedStock(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredStock}
              columns={columns}
              searchQuery={searchQuery}
              isLoading={stockLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
