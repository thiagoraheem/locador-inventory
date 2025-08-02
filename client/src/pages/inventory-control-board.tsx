import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Header from "@/components/layout/header";
import {
  Search,
  Filter,
  Download,
  Clock,
  Package,
  TrendingUp,
  Target,
  XCircle,
  Trash2,
  CheckCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  Inventory,
  InventoryItem,
  Product,
  Location,
  Category,
  ControlPanelStats,
} from "@shared/schema";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";

interface KPICardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
}

const KPICard = ({ title, value, description, icon, trend }: KPICardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {trend && (
          <TrendingUp
            className={`h-3 w-3 ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500"}`}
          />
        )}
        {description}
      </p>
    </CardContent>
  </Card>
);

interface CountIndicatorProps {
  count?: number;
  countBy?: string;
  countAt?: number;
  stage: "C1" | "C2" | "C3" | "C4";
}

const CountIndicator = ({
  count,
  countBy,
  countAt,
  stage,
}: CountIndicatorProps) => {
  const hasCount = count !== undefined && count !== null;

  return (
    <div className="flex flex-col items-center gap-1">
      <Badge
        variant={hasCount ? "default" : "outline"}
        className={`text-xs ${hasCount ? "bg-green-500" : ""}`}
      >
        {stage}
      </Badge>
      {hasCount ? (
        <div className="text-center">
          <div className="font-bold text-sm">{count}</div>
          {countBy && false && (
            <div className="text-xs text-muted-foreground">{countBy}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Pendente</div>
      )}
    </div>
  );
};

interface AccuracyIndicatorProps {
  accuracy?: number;
  difference?: number;
}

const AccuracyIndicator = ({
  accuracy,
  difference,
}: AccuracyIndicatorProps) => {
  if (accuracy === undefined)
    return <span className="text-muted-foreground">-</span>;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-green-600";
    if (acc >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-bold ${getAccuracyColor(accuracy)}`}>
        {accuracy.toFixed(1)}%
      </span>
      {difference !== undefined && (
        <span className="text-xs text-muted-foreground">Δ {difference}</span>
      )}
    </div>
  );
};

export default function InventoryControlBoard() {
  const { selectedInventoryId, setSelectedInventoryId } =
    useSelectedInventory();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [cancelReason, setCancelReason] = useState("");
  const [editingCount4, setEditingCount4] = useState<{
    [itemId: number]: number | string;
  }>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: selectedInventory, refetch: refetchInventory } =
    useQuery<Inventory>({
      queryKey: [`/api/inventories/${selectedInventoryId}`],
      enabled: !!selectedInventoryId,
    });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Check if user has audit mode access (Mesa de Controle access)
  const hasAuditAccess = () => {
    const userRole = (user as any)?.role?.toLowerCase();
    return ["admin", "gerente", "supervisor"].includes(userRole);
  };

  const { data: stats, refetch: refetchStats } = useQuery<ControlPanelStats>({
    queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
    enabled: !!selectedInventoryId,
    refetchInterval: 30000,
  });

  const { data: inventoryItems, refetch: refetchItems } = useQuery<
    InventoryItem[]
  >({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled: !!selectedInventoryId,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const startCountingMutation = useMutation({
    mutationFn: async (inventoryId: number) => {
      const response = await fetch(
        `/api/inventories/${inventoryId}/start-counting`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: (user as any)?.id || "user1" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start counting");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem iniciada",
        description: "A contagem foi iniciada com sucesso",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao iniciar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finishCountingMutation = useMutation({
    mutationFn: async (inventoryId: number) => {
      const response = await fetch(
        `/api/inventories/${inventoryId}/finish-counting`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: "user1" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to finish counting");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem finalizada",
        description: "A contagem foi finalizada com sucesso",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao finalizar contagem",
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
      setSelectedInventoryId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir inventário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update count4 in audit mode
  const updateCount4Mutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: number;
      quantity: number;
    }) => {
      const response = await fetch(`/api/inventory-items/${itemId}/count4`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update count4");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Auditoria registrada",
        description: `Count4 atualizado para ${variables.quantity}. Quantidade final atualizada automaticamente.`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/items`],
      });
      setEditingCount4((prev) => {
        const updated = { ...prev };
        delete updated[variables.itemId];
        return updated;
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na auditoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to finalize audit and close inventory
  const finalizeAuditMutation = useMutation({
    mutationFn: async (inventoryId: number) => {
      // First validate if inventory can be closed
      const validateResponse = await fetch(
        `/api/inventories/${inventoryId}/validate-closure`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!validateResponse.ok) {
        throw new Error("Failed to validate inventory closure");
      }

      const validation = await validateResponse.json();
      if (!validation.canClose) {
        throw new Error(validation.message);
      }

      // If validation passes, close the inventory
      const response = await fetch(
        `/api/inventories/${inventoryId}/finish-counting`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: user?.id || "audit_user" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to finalize audit");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Auditoria finalizada",
        description: "O inventário foi fechado com sucesso após auditoria",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao finalizar auditoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedInventory?.startDate) {
      setStartTime(selectedInventory.startDate);
    }
  }, [selectedInventory]);

  const getElapsedTime = () => {
    const countingStartTime = getCountingStartTime(); // ← string ISO
    const startMs = new Date(countingStartTime).getTime(); // ← número

    const elapsed = Date.now() - startMs;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const getInventoriedPercentage = () => {
    if (!stats) return 0;
    const total = stats.itemsInProgress + stats.itemsCompleted;
    return total > 0 ? (stats.itemsCompleted / total) * 100 : 0;
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p) => p.id === productId);
    return product
      ? `${product.sku} - ${product.name}`
      : `Product ${productId}`;
  };

  const getLocationName = (locationId: number) => {
    return (
      locations?.find((l) => l.id === locationId)?.name ||
      `Location ${locationId}`
    );
  };

  const filteredItems =
    inventoryItems?.filter((item) => {
      const productName = getProductName(item.productId);
      const locationName = getLocationName(item.locationId);

      const matchesSearch =
        searchTerm === "" ||
        productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        locationName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const handleExport = () => {
    console.log("Export functionality to be implemented");
  };

  const handleCancelInventory = () => {
    if (selectedInventoryId && cancelReason.trim()) {
      // cancelInventoryMutation.mutate({ id: selectedInventoryId, reason: cancelReason });
      setCancelReason("");
    }
  };

  const handleDeleteInventory = () => {
    if (selectedInventoryId) {
      deleteInventoryMutation.mutate(selectedInventoryId);
    }
  };

  // Helper functions for counting status
  const canStartCounting = (status: string) => {
    return ["open", "count1_closed", "count2_closed", "count3_required"].includes(status);
  };

  const canFinishCounting = (status: string) => {
    return ["count1_open", "count2_open", "count3_open"].includes(status);
  };

  const getCountingStageText = (status: string) => {
    switch (status) {
      case "open":
        return "Pronto para 1ª Contagem";
      case "count1_open":
        return "1ª Contagem Aberta";
      case "count1_closed":
        return "Pronto para 2ª Contagem";
      case "count2_open":
        return "2ª Contagem Aberta";
      case "count2_closed":
        return "Pronto para 3ª Contagem";
      case "count3_required":
        return "3ª Contagem Necessária";
      case "count3_open":
        return "3ª Contagem Aberta";
      case "count3_closed":
        return "Contagens Finalizadas";
      case "audit_mode":
        return "Modo Auditoria";
      case "closed":
        return "Finalizado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  // Handle count4 editing
  const handleCount4Save = (itemId: number) => {
    const quantity = editingCount4[itemId];
    if (typeof quantity === "number" && quantity >= 0) {
      updateCount4Mutation.mutate({ itemId, quantity });
    }
  };

  const handleCount4Change = (itemId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditingCount4((prev) => ({
        ...prev,
        [itemId]: numValue,
      }));
    } else if (value === "") {
      setEditingCount4((prev) => ({
        ...prev,
        [itemId]: "",
      }));
    }
  };

  // Function to refresh all data
  const handleRefreshData = async () => {
    await Promise.all([
      refetchStats(),
      refetchItems(),
      refetchInventory(),
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] }),
    ]);

    toast({
      title: "Dados atualizados",
      description: "Todas as informações foram recarregadas com sucesso.",
    });
  };

  // Get counting start time - use the first counting date found
  const getCountingStartTime = () => {
    if (!selectedInventory) return Date.now();

    // Check for counting start in the status progression
    const countingStatuses = [
      "count1_open",
      "count1_closed",
      "count2_open",
      "count2_closed",
      "count3_open",
      "count3_closed",
      "audit_mode",
      "closed",
    ];
    const isCountingStarted = countingStatuses.includes(
      selectedInventory.status,
    );

    if (isCountingStarted) {
      // Find first count date from inventory items
      if (inventoryItems && inventoryItems.length > 0) {
        const firstCountTime = inventoryItems
          .map((item) => item.count1At)
          .filter(Boolean)
          .sort((a, b) => a! - b!)[0];

        if (firstCountTime) return firstCountTime;
      }
    }

    return selectedInventory.startDate;
  };

  // Check if inventory is in audit mode
  const isAuditMode = selectedInventory?.status === "audit_mode";

  // Get items that need audit (items with divergences or without finalQuantity)
  const getAuditItems = () => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(
      (item) =>
        item.finalQuantity === null ||
        item.finalQuantity === undefined ||
        (item.count1 !== undefined &&
          item.count2 !== undefined &&
          item.count1 !== item.count2),
    );
  };

  return (
    <div>
      <Header
        title="Mesa de Controle"
        subtitle="Controle centralizado de inventários ativos"
      />

      <div className="space-y-6">
        {/* Inventory Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Inventário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select
                  value={selectedInventoryId?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedInventoryId(parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um inventário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventories?.map((inventory) => (
                      <SelectItem
                        key={inventory.id}
                        value={inventory.id.toString()}
                      >
                        {inventory.code} -{" "}
                        {inventory.description || "Sem descrição"} (
                        {inventory.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInventoryId && selectedInventory && (
                <div className="flex gap-2">
                  {/* Counting Control Buttons */}
                  <Button
                    variant="default"
                    size="sm"
                    disabled={
                      !canStartCounting(selectedInventory.status) ||
                      startCountingMutation.isPending
                    }
                    onClick={() =>
                      selectedInventoryId &&
                      startCountingMutation.mutate(selectedInventoryId)
                    }
                  >
                    Iniciar Contagem
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      !canFinishCounting(selectedInventory.status) ||
                      finishCountingMutation.isPending
                    }
                    onClick={() =>
                      selectedInventoryId &&
                      finishCountingMutation.mutate(selectedInventoryId)
                    }
                  >
                    Finalizar Contagem
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedInventoryId && selectedInventory ? (
          <>
            {/* Header with KPIs */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pl-4 pr-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Inventário: {selectedInventory.code}
                  </h2>
                  <p className="text-muted-foreground">
                    Status:{" "}
                    <Badge variant="outline">
                      {getCountingStageText(selectedInventory.status)}
                    </Badge>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRefreshData}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Recarregar
                  </Button>
                  <Button
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Relatório
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Produtos"
                  value={
                    (stats?.itemsInProgress || 0) + (stats?.itemsCompleted || 0)
                  }
                  description="Itens distintos sendo inventariados"
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KPICard
                  title="Categorias"
                  value={categories?.length || 0}
                  description="Categorias ativas"
                  icon={<Target className="h-4 w-4 text-muted-foreground" />}
                />
                <KPICard
                  title="Inventariado"
                  value={`${getInventoriedPercentage().toFixed(1)}%`}
                  description={`${stats?.itemsCompleted || 0} de ${(stats?.itemsInProgress || 0) + (stats?.itemsCompleted || 0)} itens`}
                  icon={
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  }
                  trend="up"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <KPICard
                          title="Tempo Decorrido"
                          value={getElapsedTime()}
                          description="Desde o início da contagem"
                          icon={
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm p-4">
                      <div className="space-y-2">
                        <p className="font-semibold">Fórmula de Cálculo:</p>
                        <p className="text-sm">
                          Tempo Atual - Data de Início da Contagem
                        </p>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs">
                            <strong>Tempo Atual:</strong>{" "}
                            {new Date().toLocaleString("pt-BR")}
                          </p>
                          <p className="text-xs">
                            <strong>Início da Contagem:</strong>{" "}
                            {new Date(getCountingStartTime()).toLocaleString(
                              "pt-BR",
                            )}
                          </p>
                          <p className="text-xs">
                            <strong>Diferença:</strong>{" "}
                            {Math.floor(
                              (Date.now() - getCountingStartTime()) /
                                (1000 * 60),
                            )}{" "}
                            minutos
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Progress Bar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Progresso Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={getInventoriedPercentage()}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>
                      Acuracidade Média: {stats?.accuracyRate?.toFixed(1) || 0}%
                    </span>
                    <span>Divergências: {stats?.divergenceCount || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle>Controle de Itens</CardTitle>
                <CardDescription>
                  Acompanhe o progresso de contagem por item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por produto ou local..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                      <SelectItem value="COMPLETED">Concluído</SelectItem>
                      <SelectItem value="DIVERGENT">Divergente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Main Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Local de Estoque</TableHead>
                        <TableHead>Qtd. Estoque</TableHead>
                        <TableHead className="text-center">C1</TableHead>
                        <TableHead className="text-center">C2</TableHead>
                        <TableHead className="text-center">C3</TableHead>
                        <TableHead className="text-center">C4</TableHead>
                        <TableHead>Qtd. Final</TableHead>
                        <TableHead>Diferença</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {getProductName(item.productId)}
                          </TableCell>
                          <TableCell>
                            {getLocationName(item.locationId)}
                          </TableCell>
                          <TableCell>{item.expectedQuantity}</TableCell>
                          <TableCell>
                            <CountIndicator
                              count={item.count1}
                              countBy={item.count1By?.toString()}
                              countAt={item.count1At}
                              stage="C1"
                            />
                          </TableCell>
                          <TableCell>
                            <CountIndicator
                              count={item.count2}
                              countBy={item.count2By?.toString()}
                              countAt={item.count2At}
                              stage="C2"
                            />
                          </TableCell>
                          <TableCell>
                            <CountIndicator
                              count={item.count3}
                              countBy={item.count3By?.toString()}
                              countAt={item.count3At}
                              stage="C3"
                            />
                          </TableCell>
                          <TableCell>
                            {isAuditMode && hasAuditAccess() ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Auditoria..."
                                  value={
                                    editingCount4[item.id] ?? item.count4 ?? ""
                                  }
                                  onChange={(e) =>
                                    handleCount4Change(item.id, e.target.value)
                                  }
                                  className="w-20 text-center"
                                  disabled={updateCount4Mutation.isPending}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCount4Save(item.id)}
                                  disabled={
                                    updateCount4Mutation.isPending ||
                                    !editingCount4[item.id] ||
                                    editingCount4[item.id] === ""
                                  }
                                  className="px-2"
                                >
                                  ✓
                                </Button>
                              </div>
                            ) : (
                              <CountIndicator
                                count={item.count4}
                                countBy={item.count4By?.toString()}
                                countAt={item.count4At}
                                stage="C4"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {item.finalQuantity !== undefined ? (
                              <span className="font-bold">
                                {item.finalQuantity}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.count1 !== undefined &&
                            item.count2 !== undefined ? (
                              <span
                                className={
                                  Math.abs(
                                    item.count1 - item.expectedQuantity,
                                  ) > 0 ||
                                  Math.abs(
                                    item.count2 - item.expectedQuantity,
                                  ) > 0
                                    ? "text-red-600"
                                    : "text-green-600"
                                }
                              >
                                {item.count1 === item.expectedQuantity &&
                                item.count2 === item.expectedQuantity
                                  ? "0"
                                  : "Divergente"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "COMPLETED"
                                  ? "default"
                                  : item.status === "IN_PROGRESS"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {item.status === "COMPLETED"
                                ? "Concluído"
                                : item.status === "IN_PROGRESS"
                                  ? "Em Progresso"
                                  : "Pendente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer with Totals */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total de Itens: </span>
                      <span>{filteredItems.length}</span>
                    </div>
                    <div>
                      <span className="font-medium">Concluídos: </span>
                      <span>
                        {
                          filteredItems.filter(
                            (item) =>
                              item.count1 !== undefined &&
                              item.count2 !== undefined,
                          ).length
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Divergências: </span>
                      <span className="text-red-600">
                        {
                          filteredItems.filter(
                            (item) =>
                              item.count1 !== undefined &&
                              item.count2 !== undefined &&
                              (Math.abs(item.count1 - item.expectedQuantity) >
                                0 ||
                                Math.abs(item.count2 - item.expectedQuantity) >
                                  0),
                          ).length
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Acuracidade Média: </span>
                      <span className="font-bold">
                        {stats?.accuracyRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Mode Section */}
            {isAuditMode && hasAuditAccess() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    Modo Auditoria - Itens com Divergências
                  </CardTitle>
                  <CardDescription>
                    Revise e ajuste manualmente os itens que precisam de
                    auditoria. Alterações em C4 atualizam automaticamente a
                    quantidade final.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getAuditItems().length > 0 ? (
                    <>
                      <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <span className="font-medium">
                            {getAuditItems().length} itens precisam de auditoria
                          </span>
                        </div>
                      </div>

                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Local</TableHead>
                              <TableHead>Estoque</TableHead>
                              <TableHead>C1</TableHead>
                              <TableHead>C2</TableHead>
                              <TableHead>C3</TableHead>
                              <TableHead>C4 (Auditoria)</TableHead>
                              <TableHead>Qtd. Final</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getAuditItems().map((item) => (
                              <TableRow
                                key={item.id}
                                className="bg-orange-50/50 dark:bg-orange-900/10"
                              >
                                <TableCell className="font-medium">
                                  {getProductName(item.productId)}
                                </TableCell>
                                <TableCell>
                                  {getLocationName(item.locationId)}
                                </TableCell>
                                <TableCell>{item.expectedQuantity}</TableCell>
                                <TableCell className="text-center">
                                  {item.count1 ?? "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.count2 ?? "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.count3 ?? "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Quantidade auditada..."
                                      value={
                                        editingCount4[item.id] ??
                                        item.count4 ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleCount4Change(
                                          item.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-32"
                                      disabled={updateCount4Mutation.isPending}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleCount4Save(item.id)}
                                      disabled={
                                        updateCount4Mutation.isPending ||
                                        !editingCount4[item.id] ||
                                        editingCount4[item.id] === ""
                                      }
                                    >
                                      {updateCount4Mutation.isPending
                                        ? "..."
                                        : "Confirmar"}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`font-bold ${item.finalQuantity !== null && item.finalQuantity !== undefined ? "text-green-600" : "text-orange-600"}`}
                                  >
                                    {item.finalQuantity ?? "Pendente"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.finalQuantity !== null &&
                                      item.finalQuantity !== undefined
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {item.finalQuantity !== null &&
                                    item.finalQuantity !== undefined
                                      ? "Auditado"
                                      : "Pendente"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() =>
                            selectedInventoryId &&
                            finalizeAuditMutation.mutate(selectedInventoryId)
                          }
                          disabled={
                            finalizeAuditMutation.isPending ||
                            getAuditItems().some(
                              (item) =>
                                item.finalQuantity === null ||
                                item.finalQuantity === undefined,
                            )
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {finalizeAuditMutation.isPending
                            ? "Finalizando..."
                            : "Confirmar Auditoria e Fechar Inventário"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-green-600 mb-2">
                        <CheckCircle className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Auditoria Concluída
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Todos os itens foram auditados e têm quantidades finais
                        definidas.
                      </p>
                      <Button
                        onClick={() =>
                          selectedInventoryId &&
                          finalizeAuditMutation.mutate(selectedInventoryId)
                        }
                        disabled={finalizeAuditMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {finalizeAuditMutation.isPending
                          ? "Finalizando..."
                          : "Fechar Inventário"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Access Denied for Audit Mode */}
            {isAuditMode && !hasAuditAccess() && (
              <Card>
                <CardContent className="py-12 text-center">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
                  <p className="text-muted-foreground">
                    Apenas usuários com acesso à Mesa de Controle (Admin,
                    Gerente, Supervisor) podem realizar operações em modo
                    auditoria.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Selecione um Inventário
              </h3>
              <p className="text-muted-foreground">
                Escolha um inventário acima para visualizar as informações na
                Mesa de Controle
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
