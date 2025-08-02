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
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import type {
  Inventory,
  InventoryItem,
  Product,
  Location,
} from "@shared/schema";
import Header from "@/components/layout/header";
import SelectedInventoryInfo from "@/components/selected-inventory-info";

export default function InventoryCounts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const { selectedInventoryId, setSelectedInventoryId } =
    useSelectedInventory();
  const [countValues, setCountValues] = useState<{
    [itemId: number]: number | string;
  }>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const selectedInventory = inventories?.find(
    (inv) => inv.id === selectedInventoryId,
  );

  // Get selected inventory details
  const selectedInventoryData = inventories?.find(
    (inv) => inv.id === selectedInventoryId,
  );

  // Fetch inventory items for selected inventory
  const { data: inventoryItems, refetch: refetchItems } = useQuery<
    InventoryItem[]
  >({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled:
      !!selectedInventoryId && selectedInventoryData?.status !== "count3_open",
  });

  // Fetch divergent items for 3rd count (only items that need 3rd count)
  const { data: divergentItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items/divergent`],
    enabled:
      !!selectedInventoryId && selectedInventoryData?.status === "count3_open",
  });

  // Use appropriate data source based on inventory status
  const currentItems =
    selectedInventoryData?.status === "count3_open"
      ? divergentItems
      : inventoryItems;

  // Fetch all products
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch all locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Get current count stage based on inventory status
  const getCurrentCountStage = (status: string): number => {
    switch (status) {
      case "count1_open":
        return 1;
      case "count1_closed":
        return 1;
      case "count2_open":
        return 2;
      case "count2_closed":
        return 2;
      case "count3_open":
        return 3;
      case "count3_closed":
        return 3;
      default:
        return 1;
    }
  };

  // Get item status (counted or pending)
  const getItemStatus = (
    item: InventoryItem,
    stage: number,
  ): "counted" | "pending" => {
    switch (stage) {
      case 1:
        return item.count1 !== null && item.count1 !== undefined
          ? "counted"
          : "pending";
      case 2:
        return item.count2 !== null && item.count2 !== undefined
          ? "counted"
          : "pending";
      case 3:
        return item.count3 !== null && item.count3 !== undefined
          ? "counted"
          : "pending";
      default:
        return "pending";
    }
  };

  // Get current count value for an item
  const getCurrentCount = (
    item: InventoryItem,
    stage: number,
  ): number | null => {
    switch (stage) {
      case 1:
        return item.count1 ?? null;
      case 2:
        return item.count2 ?? null;
      case 3:
        return item.count3 ?? null;
      default:
        return null;
    }
  };

  // Filter active inventories
  const activeInventories =
    inventories?.filter(
      (inv) => inv.status !== "closed" && inv.status !== "cancelled",
    ) || [];

  // Get current stage for the selected inventory
  const selectedInv = inventories?.find(
    (inv) => inv.id === selectedInventoryId,
  );
  const currentStage = selectedInv
    ? getCurrentCountStage(selectedInv.status)
    : 1;

  // Filter items based on search term and status
  const filteredItems =
    currentItems?.filter((item) => {
      const product = products?.find((p) => p.id === item.productId);
      const location = locations?.find((l) => l.id === item.locationId);
      const searchMatch =
        product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;

      if (statusFilter === "all") {
        return searchMatch;
      } else if (statusFilter === "counted") {
        const status = getItemStatus(item, currentStage);
        return searchMatch && status === "counted";
      } else if (statusFilter === "pending") {
        const status = getItemStatus(item, currentStage);
        return searchMatch && status === "pending";
      }

      return searchMatch;
    }) || [];

  // Get final quantity status
  const getFinalQuantityStatus = (item: InventoryItem) => {
    if (item.finalQuantity === null) return null;

    const isDivergent =
      item.count1 !== item.count2 ||
      (item.count3 !== null &&
        item.count3 !== item.count1 &&
        item.count3 !== item.count2);

    return {
      variant: (isDivergent ? "destructive" : "secondary") as
        | "destructive"
        | "secondary",
      label: isDivergent ? "Divergente" : "Concluído",
    };
  };

  // Check if counting can be performed based on inventory status
  const canPerformCounting = (status: string): boolean => {
    return ["count1_open", "count2_open", "count3_open"].includes(status);
  };

  // Mutation to update count
  const updateCountMutation = useMutation({
    mutationFn: async ({
      itemId,
      stage,
      value,
    }: {
      itemId: number;
      stage: number;
      value: number;
    }) => {
      const response = await fetch(
        `/api/inventory-items/${itemId}/count${stage}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ count: value }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to update count";
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/items`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/items/divergent`],
      });
      toast({
        title: "Contagem registrada",
        description: "A contagem foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle save count
  const handleSaveCount = (itemId: number, stage: number) => {
    const value = countValues[itemId];

    if (!value || value === "") {
      toast({
        title: "Erro ao registrar contagem",
        description: "Informe uma quantidade válida.",
        variant: "destructive",
      });
      return;
    }

    if (!canPerformCounting(selectedInv?.status || "")) {
      toast({
        title: "Erro ao registrar contagem",
        description: "O inventário não está aberto para contagem.",
        variant: "destructive",
      });
      return;
    }

    updateCountMutation.mutate({ itemId, stage, value: Number(value) });

    // Clear the input after successful count
    setCountValues((prev) => ({
      ...prev,
      [itemId]: "",
    }));
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1:
        return "1ª Contagem";
      case 2:
        return "2ª Contagem";
      case 3:
        return "3ª Contagem";
      default:
        return `${stage}ª Contagem`;
    }
  };

  return (
    <div>
      <Header
        title="Contagens de Inventário"
        subtitle="Registre as contagens dos itens de inventário"
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Cabeçalho condensado com seleção de inventário e filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Seleção de Inventário */}
          <Card className="lg:col-span-1">
            <CardContent className="p-3 pt-3">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Inventário Ativo</span>
                </div>
                <Select
                  value={selectedInventoryId?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedInventoryId(Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um inventário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeInventories.map((inventory) => (
                      <SelectItem
                        key={inventory.id}
                        value={inventory.id.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {inventory.code} -{" "}
                            {inventory.description || "Sem descrição"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getStageLabel(
                              getCurrentCountStage(inventory.status),
                            )}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInv && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {getStageLabel(currentStage)}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedInv.description}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedInventory && (
            <>
              {/* Filtro de Busca */}
              <Card className="lg:col-span-1">
                <CardContent className="p-3 pt-3">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Buscar Item</span>
                    </div>
                    <Input
                      placeholder="Nome do produto, SKU ou local..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Filtro de Visualização */}
              <Card className="lg:col-span-1">
                <CardContent className="p-3 pt-3">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Visualizar</span>
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          Apenas Pendentes (Contagem Às Cegas)
                        </SelectItem>
                        <SelectItem value="counted">
                          Mostrar Já Contados
                        </SelectItem>
                        <SelectItem value="all">Mostrar Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {selectedInventory && (
          <>
            {/* Tabela de Contagem - Destacada */}
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-primary" />
                      {getStageLabel(currentStage)}
                      {selectedInventoryData?.status === "count3_open" && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Apenas itens divergentes
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedInventoryData?.status === "count3_open"
                        ? "3ª Contagem - Apenas itens com divergência entre 1ª e 2ª contagem"
                        : "Contagem às cegas - registre apenas o que você consegue contar fisicamente"}
                    </CardDescription>
                  </div>
                  {currentItems && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">
                        {
                          currentItems.filter(
                            (item) =>
                              getItemStatus(item, currentStage) === "counted",
                          ).length
                        }
                        /{currentItems.length} itens{" "}
                        {selectedInventoryData?.status === "count3_open"
                          ? "divergentes "
                          : ""}
                        contados
                      </span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Produto</TableHead>
                        <TableHead className="font-semibold">Local</TableHead>
                        <TableHead className="font-semibold">
                          Qtd. Contada
                        </TableHead>
                        <TableHead className="font-semibold">
                          Status Final
                        </TableHead>
                        <TableHead className="font-semibold">
                          Status Contagem
                        </TableHead>
                        <TableHead className="font-semibold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Package className="h-10 w-10 opacity-20" />
                              <div className="text-lg font-medium">
                                {currentItems?.length === 0
                                  ? selectedInventoryData?.status ===
                                    "count3_open"
                                    ? "Nenhum item divergente encontrado - todas as contagens estão alinhadas!"
                                    : "Nenhum item encontrado para este inventário"
                                  : statusFilter === "pending"
                                    ? "Todos os itens pendentes já foram contados!"
                                    : statusFilter === "counted"
                                      ? "Nenhum item contado encontrado para este inventário"
                                      : "Nenhum item corresponde aos filtros aplicados"}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item, index) => {
                          const product = products?.find(
                            (p) => p.id === item.productId,
                          );
                          const location = locations?.find(
                            (l) => l.id === item.locationId,
                          );
                          const currentCount = getCurrentCount(
                            item,
                            currentStage,
                          );
                          const status = getItemStatus(item, currentStage);
                          const countValue =
                            countValues[item.id] ?? (currentCount || "");
                          const finalStatus = getFinalQuantityStatus(item);

                          return (
                            <TableRow
                              key={item.id}
                              className={
                                index % 2 === 0
                                  ? "bg-background"
                                  : "bg-muted/20"
                              }
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {product?.name || "N/A"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {product?.sku || "N/A"}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {location?.name || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={
                                    canPerformCounting(
                                      selectedInv?.status || "",
                                    )
                                      ? "Quantidade contada..."
                                      : "Contagem bloqueada"
                                  }
                                  value={countValue}
                                  onChange={(e) =>
                                    setCountValues((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="w-32 border-primary/40 focus:border-primary"
                                  disabled={
                                    !canPerformCounting(
                                      selectedInv?.status || "",
                                    )
                                  }
                                  autoFocus
                                />
                              </TableCell>
                              <TableCell>
                                {finalStatus ? (
                                  <Badge
                                    variant={finalStatus.variant}
                                    className="px-2 py-1"
                                  >
                                    <div className="flex items-center gap-1">
                                      {finalStatus.variant === "secondary" ? (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      ) : (
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      )}
                                      <span className="font-medium">
                                        {finalStatus.label}
                                      </span>
                                    </div>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="px-2 py-1"
                                  >
                                    <Clock className="h-3.5 w-3.5 mr-1" />
                                    <span className="font-medium">
                                      Em andamento
                                    </span>
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {canPerformCounting(
                                  selectedInv?.status || "",
                                ) ? (
                                  <Badge
                                    variant="secondary"
                                    className="px-2 py-1 bg-secondary/80"
                                  >
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium">
                                        Aguardando Contagem
                                      </span>
                                    </div>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="destructive"
                                    className="px-2 py-1"
                                  >
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium">
                                        Contagem Bloqueada
                                      </span>
                                    </div>
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={
                                    canPerformCounting(
                                      selectedInv?.status || "",
                                    )
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    canPerformCounting(
                                      selectedInv?.status || "",
                                    )
                                      ? "bg-primary hover:bg-primary/90"
                                      : ""
                                  }
                                  onClick={() =>
                                    handleSaveCount(item.id, currentStage)
                                  }
                                  disabled={
                                    updateCountMutation.isPending ||
                                    !countValue ||
                                    countValue === "" ||
                                    !canPerformCounting(
                                      selectedInv?.status || "",
                                    )
                                  }
                                >
                                  {updateCountMutation.isPending ? (
                                    <>
                                      <span className="mr-1">Salvando</span>
                                      <span className="animate-pulse">...</span>
                                    </>
                                  ) : (
                                    "Registrar"
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
