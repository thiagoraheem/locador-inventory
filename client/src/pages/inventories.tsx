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
import InventoryForm from "@/components/inventory-form";
import DataTable from "@/components/data-table";
import { Plus, Search, Eye, Play, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import type { Inventory } from "@shared/schema";

export default function Inventories() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: inventories, isLoading: inventoriesLoading } = useQuery({
    queryKey: ["/api/inventories"],
    retry: false,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default">Aberto</Badge>;
      case 'COUNTING':
        return <Badge variant="secondary">Em Contagem</Badge>;
      case 'CLOSED':
        return <Badge variant="outline">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: "Código",
      accessorKey: "code",
      sortable: true,
    },
    {
      header: "Tipo",
      accessorKey: "type.name",
      sortable: true,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (value: string) => getStatusBadge(value),
    },
    {
      header: "Data de Início",
      accessorKey: "startDate",
      sortable: true,
      cell: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: "Criado por",
      accessorKey: "createdByUser.firstName",
      cell: (value: string, row: any) => {
        if (!row.createdByUser) return 'N/A';
        const fullName = `${row.createdByUser.firstName || ''} ${row.createdByUser.lastName || ''}`.trim();
        return fullName || row.createdByUser.email || 'N/A';
      },
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: any) => (
        <div className="flex items-center space-x-2">
          <Link href={`/inventory-counting/${row.id}`}>
            <Button variant="ghost" size="sm" title="Abrir contagem">
              {row.status === 'OPEN' ? <Play className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </Link>
          {row.status === 'COUNTING' && (
            <Link href={`/inventory-review/${row.id}`}>
              <Button variant="ghost" size="sm" title="Revisar inventário">
                <CheckCircle className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Inventários" subtitle="Gerenciamento de inventários de estoque" />
      
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista de Inventários</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  placeholder="Filtrar inventários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Inventário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Inventário</DialogTitle>
                  </DialogHeader>
                  <InventoryForm
                    onSuccess={() => {
                      setIsFormOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={inventories || []}
              columns={columns}
              searchQuery={searchQuery}
              isLoading={inventoriesLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
