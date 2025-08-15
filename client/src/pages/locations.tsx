// @ts-nocheck
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Location } from "@shared/schema";

export default function Locations() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations", searchQuery],
    retry: false,
  });



  const columns = [
    {
      header: "Código",
      accessorKey: "code",
      sortable: true,
    },
    {
      header: "Nome do Local",
      accessorKey: "name",
      sortable: true,
    },
    {
      header: "Descrição",
      accessorKey: "description",
      cell: (value: string) => value || "Sem descrição",
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

  return (
    <div>
      <Header title="Locais de Estoque" subtitle="Visualização de locais de armazenamento (somente leitura)" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Esta tela é somente para visualização. Os dados de locais são gerenciados externamente.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista de Locais</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  placeholder="Filtrar locais..."
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
              data={locations || []}
              columns={columns}
              searchQuery={searchQuery}
              isLoading={locationsLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
