import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  MapPin, 
  Package, 
  CheckCircle, 
  XCircle,
  Upload,
  Loader2,
  FileText,
  Eye,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import Header from "@/components/layout/header";
import SelectedInventoryInfo from "@/components/selected-inventory-info";
import { apiRequest } from "@/lib/queryClient";
import type { Inventory } from "@shared/schema";

interface SerialDiscrepancy {
  id: number;
  inventoryId: number;
  serialNumber: string;
  productId: number;
  productSku: string;
  productName: string;
  expectedLocationId?: number;
  expectedLocationName?: string;
  foundLocationId?: number;
  foundLocationName?: string;
  discrepancyType: 'LOCATION_MISMATCH' | 'NOT_FOUND' | 'UNEXPECTED_FOUND';
  status: 'PENDING' | 'RESOLVED' | 'MIGRATED';
  notes?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SerialDiscrepancySummary {
  total: number;
  locationMismatch: number;
  notFound: number;
  unexpectedFound: number;
  pending: number;
  resolved: number;
  migrated: number;
}

interface SerialDiscrepanciesResponse {
  discrepancies: SerialDiscrepancy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SerialDiscrepanciesPage() {
  const { selectedInventoryId } = useSelectedInventory();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<SerialDiscrepancy | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  // Query para buscar divergências
  const { data: discrepanciesData, isLoading, refetch } = useQuery<SerialDiscrepanciesResponse>({
    queryKey: [
      `/api/serial-discrepancies`,
      selectedInventoryId,
      searchTerm,
      statusFilter,
      typeFilter,
      page
    ],
    queryFn: async () => {
      if (!selectedInventoryId) throw new Error("Nenhum inventário selecionado");
      
      const params = new URLSearchParams({
        inventoryId: selectedInventoryId.toString(),
        page: page.toString(),
        limit: "20"
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      
      return await apiRequest(`/api/serial-discrepancies?${params.toString()}`);
    },
    enabled: !!selectedInventoryId,
    staleTime: 30000,
  });

  // Query para resumo das divergências
  const { data: summary } = useQuery<SerialDiscrepancySummary>({
    queryKey: [`/api/serial-discrepancies/summary`, selectedInventoryId],
    queryFn: async () => {
      if (!selectedInventoryId) throw new Error("Nenhum inventário selecionado");
      return await apiRequest(`/api/serial-discrepancies/summary?inventoryId=${selectedInventoryId}`);
    },
    enabled: !!selectedInventoryId,
    staleTime: 30000,
  });

  // Mutation para processar divergências
  const processDiscrepanciesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInventoryId) throw new Error("Nenhum inventário selecionado");
      return await apiRequest(`/api/serial-discrepancies/process`, "POST", {
        inventoryId: selectedInventoryId
      });
    },
    onSuccess: () => {
      toast({
        title: "Divergências processadas",
        description: "As divergências de números de série foram processadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/serial-discrepancies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/serial-discrepancies/summary`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar divergências",
        description: error.message || "Falha ao processar divergências",
        variant: "destructive",
      });
    },
  });

  // Mutation para resolver divergência
  const resolveDiscrepancyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return await apiRequest(`/api/serial-discrepancies/${id}/resolve`, "PUT", {
        resolutionNotes: notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Divergência resolvida",
        description: "A divergência foi marcada como resolvida.",
      });
      setShowResolutionDialog(false);
      setSelectedDiscrepancy(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: [`/api/serial-discrepancies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/serial-discrepancies/summary`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resolver divergência",
        description: error.message || "Falha ao resolver divergência",
        variant: "destructive",
      });
    },
  });

  // Mutation para exportar divergências
  const exportDiscrepanciesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInventoryId) throw new Error("Nenhum inventário selecionado");
      const response = await fetch(`/api/serial-discrepancies/export?inventoryId=${selectedInventoryId}`);
      if (!response.ok) throw new Error("Falha ao exportar");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `divergencias-serie-${selectedInventoryId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportação concluída",
        description: "O arquivo foi baixado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na exportação",
        description: error.message || "Falha ao exportar divergências",
        variant: "destructive",
      });
    },
  });

  const getDiscrepancyTypeLabel = (type: string) => {
    switch (type) {
      case 'LOCATION_MISMATCH':
        return 'Local Diferente';
      case 'NOT_FOUND':
        return 'Não Encontrado';
      case 'UNEXPECTED_FOUND':
        return 'Encontrado Inesperado';
      default:
        return type;
    }
  };

  const getDiscrepancyTypeBadge = (type: string) => {
    switch (type) {
      case 'LOCATION_MISMATCH':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Local Diferente</Badge>;
      case 'NOT_FOUND':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Não Encontrado</Badge>;
      case 'UNEXPECTED_FOUND':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Encontrado Inesperado</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pendente</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolvido</Badge>;
      case 'MIGRATED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Migrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleResolveDiscrepancy = (discrepancy: SerialDiscrepancy) => {
    setSelectedDiscrepancy(discrepancy);
    setResolutionNotes("");
    setShowResolutionDialog(true);
  };

  const confirmResolution = () => {
    if (!selectedDiscrepancy) return;
    resolveDiscrepancyMutation.mutate({
      id: selectedDiscrepancy.id,
      notes: resolutionNotes
    });
  };

  if (!selectedInventoryId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum Inventário Selecionado</h3>
              <p className="text-muted-foreground">
                Selecione um inventário para visualizar as divergências de números de série
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <SelectedInventoryInfo />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Divergências de Números de Série</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as divergências encontradas nos números de série durante o inventário
          </p>
        </div>

        {/* Resumo das Divergências */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{summary.total}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Local Diferente</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary.locationMismatch}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Não Encontrados</p>
                    <p className="text-2xl font-bold text-red-600">{summary.notFound}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Inesperados</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.unexpectedFound}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ações */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por número de série ou produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tipo de divergência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="LOCATION_MISMATCH">Local Diferente</SelectItem>
                    <SelectItem value="NOT_FOUND">Não Encontrado</SelectItem>
                    <SelectItem value="UNEXPECTED_FOUND">Encontrado Inesperado</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="RESOLVED">Resolvido</SelectItem>
                    <SelectItem value="MIGRATED">Migrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processDiscrepanciesMutation.mutate()}
                  disabled={processDiscrepanciesMutation.isPending}
                >
                  {processDiscrepanciesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Processar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportDiscrepanciesMutation.mutate()}
                  disabled={exportDiscrepanciesMutation.isPending}
                >
                  {exportDiscrepanciesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Divergências */}
        <Card>
          <CardHeader>
            <CardTitle>Divergências Encontradas</CardTitle>
            <CardDescription>
              {discrepanciesData ? `${discrepanciesData.total} divergência(s) encontrada(s)` : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando divergências...</span>
              </div>
            ) : discrepanciesData?.discrepancies.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Série</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Local Esperado</TableHead>
                      <TableHead>Local Encontrado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discrepanciesData.discrepancies.map((discrepancy) => (
                      <TableRow key={discrepancy.id}>
                        <TableCell className="font-mono">{discrepancy.serialNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{discrepancy.productName}</div>
                            <div className="text-sm text-muted-foreground">{discrepancy.productSku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getDiscrepancyTypeBadge(discrepancy.discrepancyType)}</TableCell>
                        <TableCell>
                          {discrepancy.expectedLocationName || 
                            <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {discrepancy.foundLocationName || 
                            <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(discrepancy.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {discrepancy.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolveDiscrepancy(discrepancy)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolver
                              </Button>
                            )}
                            {discrepancy.resolutionNotes && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Notas de Resolução",
                                    description: discrepancy.resolutionNotes,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Paginação */}
                {discrepanciesData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Página {discrepanciesData.page} de {discrepanciesData.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= discrepanciesData.totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma Divergência Encontrada</h3>
                <p className="text-muted-foreground">
                  Não foram encontradas divergências de números de série para este inventário.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Resolução */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Resolver Divergência</DialogTitle>
            <DialogDescription>
              Adicione notas sobre a resolução desta divergência de número de série.
            </DialogDescription>
          </DialogHeader>

          {selectedDiscrepancy && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Detalhes da Divergência:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Número de Série:</strong> {selectedDiscrepancy.serialNumber}</p>
                  <p><strong>Produto:</strong> {selectedDiscrepancy.productName}</p>
                  <p><strong>Tipo:</strong> {getDiscrepancyTypeLabel(selectedDiscrepancy.discrepancyType)}</p>
                  {selectedDiscrepancy.expectedLocationName && (
                    <p><strong>Local Esperado:</strong> {selectedDiscrepancy.expectedLocationName}</p>
                  )}
                  {selectedDiscrepancy.foundLocationName && (
                    <p><strong>Local Encontrado:</strong> {selectedDiscrepancy.foundLocationName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas de Resolução</label>
                <Textarea
                  placeholder="Descreva como esta divergência foi resolvida..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResolutionDialog(false)}
                  disabled={resolveDiscrepancyMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmResolution}
                  disabled={resolveDiscrepancyMutation.isPending || !resolutionNotes.trim()}
                >
                  {resolveDiscrepancyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolvendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolver
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}