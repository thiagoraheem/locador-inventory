import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import InventoryForm from "@/components/inventory-form";
import DataTable from "@/components/data-table";
import {
  Plus,
  Search,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import type { Inventory } from "@shared/schema";

export default function Inventories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
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

  const cancelInventoryMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/inventories/${id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel inventory");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventário cancelado",
        description: "O inventário foi cancelado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      setCancelReason("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar inventário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete inventory");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventário excluído",
        description: "O inventário foi excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir inventário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default">Aberto</Badge>;
      case "count1_open":
        return <Badge variant="secondary">1ª Contagem Aberta</Badge>;
      case "count1_closed":
        return <Badge variant="secondary">1ª Contagem Fechada</Badge>;
      case "count2_open":
        return <Badge variant="secondary">2ª Contagem Aberta</Badge>;
      case "count2_closed":
        return <Badge variant="secondary">2ª Contagem Fechada</Badge>;
      case "count3_open":
        return <Badge variant="secondary">3ª Contagem Aberta</Badge>;
      case "count3_closed":
        return <Badge variant="outline">3ª Contagem Fechada</Badge>;
      case "count3_required":
        return <Badge variant="destructive">3ª Contagem Requerida</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
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
      cell: (value: any, row: any) => row.type?.name || "N/A",
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
      cell: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      header: "Data Previsão Fim",
      accessorKey: "predictedEndDate",
      sortable: true,
      cell: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      header: "Descrição",
      accessorKey: "description",
    },
    {
      header: "Bloqueio",
      accessorKey: "isToBlockSystem",
      cell: ({ value }) => <Switch checked={Boolean(value)} disabled />,
      // Se o DataTable tiver ordenação, inclua:
      sortable: true,
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: any) => (
        <div className="flex items-center space-x-2">
          <Link href={`/inventory-counting/${row.id}`}>
            <Button variant="ghost" size="sm" title="Abrir contagem">
              {row.status === "open" ? (
                <Play className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </Link>

          {row.status !== "cancelled" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Cancelar inventário"
                  className="text-orange-600 hover:text-orange-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar Inventário</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá cancelar o inventário "{row.code}". Por favor,
                    informe o motivo do cancelamento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Motivo do cancelamento..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCancelReason("")}>
                    Voltar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (cancelReason.trim()) {
                        cancelInventoryMutation.mutate({
                          id: row.id,
                          reason: cancelReason,
                        });
                      }
                    }}
                    disabled={
                      !cancelReason.trim() || cancelInventoryMutation.isPending
                    }
                    className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                  >
                    Cancelar Inventário
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {row.status === "cancelled" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Excluir inventário"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Excluir Inventário Cancelado
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá excluir permanentemente o inventário "
                    {row.code}" e todos os seus dados associados. Esta ação não
                    pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteInventoryMutation.mutate(row.id)}
                    disabled={deleteInventoryMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    Excluir Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Inventários"
        subtitle="Gerenciamento de inventários de estoque"
      />

      <div className="space-y-6 p-4 md:p-6">
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Inventário</DialogTitle>
                  </DialogHeader>
                  <InventoryForm 
                    onSuccess={() => setIsFormOpen(false)}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={Array.isArray(inventories) ? inventories : []}
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
