// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import DataTable from "@/components/data-table";
import { Search, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Categories() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect to home if not authenticated
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

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });



  const columns = [
    {
      header: "Nome",
      accessorKey: "name",
      sortable: true,
    },
    {
      header: "Descrição",
      accessorKey: "description",
      sortable: false,
      cell: (value: string) => value || "-",
    },
    {
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
      cell: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {value ? "Ativo" : "Inativo"}
        </span>
      ),
    },

  ];

  // Filter categories based on search
  const filteredCategories = (categories || []).filter((item: any) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <Header title="Categorias" subtitle="Visualização de categorias de produtos (somente leitura)" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Esta tela é somente para visualização. Os dados de categorias são gerenciados externamente.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorias Cadastradas</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  placeholder="Filtrar categorias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredCategories}
              columns={columns}
              isLoading={categoriesLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}