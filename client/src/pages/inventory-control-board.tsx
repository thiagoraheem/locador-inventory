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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
  Settings,
  BarChart3,
  AlertTriangle,
  Calendar,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Temporary type definitions - replace with actual shared schema
interface Inventory {
  id: number;
  code: string;
  description?: string;
  status: string;
  startDate: number;
  selectedCategoryIds?: string | number[];
}

interface InventoryItem {
  id: number;
  productId: number;
  locationId: number;
  expectedQuantity: number;
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  count1At?: number;
  count2At?: number;
  count3At?: number;
  count4At?: number;
  count1By?: number;
  count2By?: number;
  count3By?: number;
  count4By?: number;
  finalQuantity?: number;
  status: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface ControlPanelStats {
  itemsInProgress: number;
  itemsCompleted: number;
  accuracyRate: number;
  divergenceCount: number;
}

// Temporary hook - replace with actual implementation
const useSelectedInventory = () => {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(
    null,
  );
  return { selectedInventoryId, setSelectedInventoryId };
};

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

export default function InventoryControlBoard() {
  const { selectedInventoryId, setSelectedInventoryId } =
    useSelectedInventory();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [divergenceFilter, setDivergenceFilter] = useState("all");
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [cancelReason, setCancelReason] = useState("");
  const [editingCount4, setEditingCount4] = useState<{
    [itemId: number]: number | string;
  }>({});
  const [isAddCategoriesModalOpen, setIsAddCategoriesModalOpen] = useState(false);
  const [selectedCategoriesToAdd, setSelectedCategoriesToAdd] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { toast } = useToast();

  // Excel export function
  const handleExportInventory = async (inventoryId: number, inventoryCode: string) => {
    try {
      const response = await fetch(`/api/inventories/${inventoryId}/export`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export inventory');
      }
      
      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inventario_${inventoryCode}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Sucesso",
        description: "Inventário exportado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao exportar inventário",
        variant: "destructive",
      });
    }
  };

  // Função para gerar relatório de impressão da 3ª contagem
  const handlePrintThirdCountReport = () => {
    if (!selectedInventory || !inventoryItems) return;

    const itemsNeedingThirdCount = inventoryItems.filter(needsThirdCount);
    
    if (itemsNeedingThirdCount.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há itens que necessitam de 3ª contagem",
        variant: "destructive",
      });
      return;
    }

    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de 3ª Contagem - ${selectedInventory.code}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .inventory-info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .count-col { text-align: center; width: 80px; }
            .signature-section { margin-top: 40px; display: flex; justify-content: space-around; }
            .signature-box { text-align: center; border-top: 1px solid #333; width: 200px; padding-top: 5px; }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RELATÓRIO DE 3ª CONTAGEM</h1>
            <h2>Itens com Divergência Entre C1 e C2</h2>
          </div>
          
          <div class="inventory-info">
            <div class="info-row">
              <strong>Código do Inventário:</strong>
              <span>${selectedInventory.code}</span>
            </div>
            <div class="info-row">
              <strong>Data de Início:</strong>
              <span>${new Date(selectedInventory.startDate).toLocaleDateString('pt-BR')}</span>
            </div>
            <div class="info-row">
              <strong>Status:</strong>
              <span>${getCountingStageText(selectedInventory.status)}</span>
            </div>
            <div class="info-row">
              <strong>Total de Itens para 3ª Contagem:</strong>
              <span>${itemsNeedingThirdCount.length}</span>
            </div>
            <div class="info-row">
              <strong>Data de Impressão:</strong>
              <span>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Produto</th>
                <th style="width: 25%;">Local de Estoque</th>
                <th class="count-col">Qtd. Estoque</th>
                <th class="count-col">C1</th>
                <th class="count-col">C2</th>
                <th class="count-col">C3</th>
                <th style="width: 15%;">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${itemsNeedingThirdCount.map(item => `
                <tr>
                  <td>${getProductName(item.productId)}</td>
                  <td>${getLocationName(item.locationId)}</td>
                  <td class="count-col">${item.expectedQuantity}</td>
                  <td class="count-col" style="background-color: #ffe6e6;">${item.count1 ?? '-'}</td>
                  <td class="count-col" style="background-color: #ffe6e6;">${item.count2 ?? '-'}</td>
                  <td class="count-col" style="border: 2px solid #333; background-color: #fff3cd;"></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <div>Responsável pela 3ª Contagem</div>
              <div style="margin-top: 20px; font-size: 12px;">Data: ___/___/___</div>
            </div>
            <div class="signature-box">
              <div>Supervisor</div>
              <div style="margin-top: 20px; font-size: 12px;">Data: ___/___/___</div>
            </div>
          </div>

          <div style="margin-top: 30px; font-size: 10px; color: #666; text-align: center;">
            <p><strong>Instruções:</strong></p>
            <p>1. Realize a contagem física dos itens destacados em amarelo na coluna C3</p>
            <p>2. Registre a quantidade encontrada na coluna C3</p>
            <p>3. Anote observações relevantes na última coluna</p>
            <p>4. Itens em vermelho (C1 e C2) apresentaram divergência e necessitam de nova contagem</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };
  const queryClient = useQueryClient();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: selectedInventory, refetch: refetchInventory } =
    useQuery<Inventory>({
      queryKey: [`/api/inventories/${selectedInventoryId}`],
      enabled: !!selectedInventoryId,
      refetchInterval: selectedInventoryId ? 15000 : false, // 15 seconds when inventory selected
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
    refetchInterval: selectedInventoryId ? 15000 : false, // 15 seconds when inventory selected
  });

  const { data: inventoryItems, refetch: refetchItems } = useQuery<
    InventoryItem[]
  >({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled: !!selectedInventoryId,
    refetchInterval: selectedInventoryId ? 15000 : false, // 15 seconds when inventory selected
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

  // Mutation to add categories to inventory
  const addCategoriesMutation = useMutation({
    mutationFn: async ({
      inventoryId,
      categoryIds,
    }: {
      inventoryId: number;
      categoryIds: number[];
    }) => {
      const response = await fetch(`/api/inventories/${inventoryId}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categoryIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add categories");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categorias adicionadas",
        description: "As categorias foram adicionadas ao inventário com sucesso",
      });
      setIsAddCategoriesModalOpen(false);
      setSelectedCategoriesToAdd([]);
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/items`],
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar categorias",
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
        throw new Error(
          `Failed to validate inventory closure.\n${JSON.stringify(validateResponse) || ""}`,
        );
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
          body: JSON.stringify({ userId: (user as any)?.id || "audit_user" }),
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

  // Mutation to confirm all items with current final quantities
  const confirmAllItemsMutation = useMutation({
    mutationFn: async (inventoryId: number) => {
      const response = await fetch(
        `/api/inventories/${inventoryId}/confirm-all-items`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to confirm all items");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Todos os itens confirmados",
        description: `${data.confirmedItems} itens foram confirmados com suas quantidades finais atuais`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/items`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventories/${selectedInventoryId}/stats`],
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao confirmar todos os itens",
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

  // Função para identificar divergências
  const hasDiscrepancy = (item: InventoryItem) => {
    const { count1, count2, count3, expectedQuantity } = item;
    
    // Se tem C1 e C2, verifica se são diferentes entre si ou do estoque
    if (count1 !== undefined && count2 !== undefined) {
      if (count1 !== count2) return true;
      if (count1 !== expectedQuantity || count2 !== expectedQuantity) return true;
    }
    
    // Se tem C3, verifica se é diferente do estoque
    if (count3 !== undefined && count3 !== expectedQuantity) return true;
    
    return false;
  };

  // Função para verificar se item precisa de 3ª contagem
  const needsThirdCount = (item: InventoryItem) => {
    const { count1, count2, status } = item;
    // Verifica pelo status atualizado ou pela lógica de contagens
    return status === 'NEEDS_COUNT3' || 
           (count1 !== undefined && count2 !== undefined && count1 !== count2);
  };

  // Função para obter o badge de status do item
  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { variant: 'default' as const, label: 'Concluído' };
      case 'NEEDS_COUNT3':
        return { variant: 'destructive' as const, label: 'Precisa C3' };
      case 'COUNTED_C1':
        return { variant: 'secondary' as const, label: 'Contado C1' };
      case 'PENDING':
      default:
        return { variant: 'outline' as const, label: 'Pendente' };
    }
  };

  // Função para ordenar itens
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Função para obter ícone de ordenação
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
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

      const matchesDivergence =
        divergenceFilter === "all" ||
        (divergenceFilter === "divergent" && hasDiscrepancy(item)) ||
        (divergenceFilter === "needs_count3" && needsThirdCount(item)) ||
        (divergenceFilter === "no_divergence" && !hasDiscrepancy(item));

      return matchesSearch && matchesStatus && matchesDivergence;
    }).sort((a, b) => {
      if (!sortBy) return 0;
      
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case "product":
          aValue = getProductName(a.productId);
          bValue = getProductName(b.productId);
          break;
        case "location":
          aValue = getLocationName(a.locationId);
          bValue = getLocationName(b.locationId);
          break;
        case "expectedQuantity":
          aValue = a.expectedQuantity;
          bValue = b.expectedQuantity;
          break;
        case "count1":
          aValue = a.count1 ?? -1;
          bValue = b.count1 ?? -1;
          break;
        case "count2":
          aValue = a.count2 ?? -1;
          bValue = b.count2 ?? -1;
          break;
        case "count3":
          aValue = a.count3 ?? -1;
          bValue = b.count3 ?? -1;
          break;
        case "count4":
          aValue = a.count4 ?? -1;
          bValue = b.count4 ?? -1;
          break;
        case "finalQuantity":
          aValue = a.finalQuantity ?? -1;
          bValue = b.finalQuantity ?? -1;
          break;
        case "difference":
          const aDiff = (a.finalQuantity ?? a.count3 ?? a.count2 ?? a.count1 ?? 0) - a.expectedQuantity;
          const bDiff = (b.finalQuantity ?? b.count3 ?? b.count2 ?? b.count1 ?? 0) - b.expectedQuantity;
          aValue = aDiff;
          bValue = bDiff;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? comparison : -comparison;
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }) || [];

  // Helper functions for counting status
  const canStartCounting = (status: string) => {
    return [
      "open",
      "count1_closed",
      "count2_closed",
      "count3_required",
    ].includes(status);
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
        (item.status !== "confirmed" &&
          item.count1 !== undefined &&
          item.count2 !== undefined &&
          item.count1 !== item.count2),
    );
  };

  // Get categories that are not yet included in the inventory
  const getAvailableCategories = () => {
    if (!categories || !selectedInventory) return [];
    
    // Parse selectedCategoryIds from the inventory
    let selectedCategoryIds: number[] = [];
    try {
      if (selectedInventory.selectedCategoryIds) {
        selectedCategoryIds = typeof selectedInventory.selectedCategoryIds === 'string' 
          ? JSON.parse(selectedInventory.selectedCategoryIds)
          : selectedInventory.selectedCategoryIds;
      }
    } catch (error) {
      console.error('Error parsing selectedCategoryIds:', error);
    }
    
    return categories.filter(category => !selectedCategoryIds.includes(category.id));
  };

  // Handle adding categories to inventory
  const handleAddCategories = () => {
    if (!selectedInventoryId || selectedCategoriesToAdd.length === 0) return;
    
    addCategoriesMutation.mutate({
      inventoryId: selectedInventoryId,
      categoryIds: selectedCategoriesToAdd,
    });
  };

  // Check if inventory can have categories added (up to 2nd count)
  const canAddCategories = (status: string) => {
    return ["open", "count1_open", "count1_closed", "count2_open"].includes(status);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Compacto */}
      <Header
        title="Mesa de Controle"
        subtitle="Controle centralizado de inventários ativos"
      />

      <div className="flex-1 container mx-auto p-4 space-y-4">
        {/* Seleção de Inventário e Controles */}
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select
              value={selectedInventoryId?.toString() || ""}
              onValueChange={(value) => setSelectedInventoryId(parseInt(value))}
            >
              <SelectTrigger className="h-9">
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
                Iniciar
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
                Finalizar
              </Button>

              <Button
                onClick={handleRefreshData}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Recarregar
              </Button>

              <Button
                onClick={() => handleExportInventory(selectedInventoryId, selectedInventory.code)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-green-600 hover:text-green-700"
              >
                <Download className="h-3 w-3" />
                Exportar
              </Button>

              {selectedInventory.status === "count3_open" && (
                <Button
                  onClick={handlePrintThirdCountReport}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <Package className="h-3 w-3" />
                  Relatório 3ª Contagem
                </Button>
              )}

              {canAddCategories(selectedInventory.status) && getAvailableCategories().length > 0 && (
                <Dialog open={isAddCategoriesModalOpen} onOpenChange={setIsAddCategoriesModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Categorias
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar Categorias ao Inventário</DialogTitle>
                      <DialogDescription>
                        Selecione as categorias que deseja adicionar ao inventário {selectedInventory.code}.
                        Os produtos dessas categorias serão incluídos automaticamente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {getAvailableCategories().map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={selectedCategoriesToAdd.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategoriesToAdd(prev => [...prev, category.id]);
                                } else {
                                  setSelectedCategoriesToAdd(prev => prev.filter(id => id !== category.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddCategoriesModalOpen(false);
                          setSelectedCategoriesToAdd([]);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddCategories}
                        disabled={selectedCategoriesToAdd.length === 0 || addCategoriesMutation.isPending}
                      >
                        {addCategoriesMutation.isPending ? "Adicionando..." : "Adicionar Categorias"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {selectedInventoryId && selectedInventory ? (
          <>
            {/* Estatísticas Compactas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Produtos</p>
                    <p className="text-lg font-bold">
                      {(stats?.itemsInProgress || 0) +
                        (stats?.itemsCompleted || 0)}
                    </p>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Categorias</p>
                    <p className="text-lg font-bold">
                      {categories?.length || 0}
                    </p>
                  </div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="text-lg font-bold">
                      {getInventoriedPercentage().toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Divergências
                    </p>
                    <p className="text-lg font-bold text-destructive">
                      {stats?.divergenceCount || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo</p>
                    <p className="text-lg font-bold">{getElapsedTime()}</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Acuracidade</p>
                    <p className="text-lg font-bold text-success">
                      {stats?.accuracyRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-success" />
                </div>
              </Card>
            </div>

            {/* Barra de Progresso Simples */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Status: {getCountingStageText(selectedInventory.status)}
                </span>
                <span>
                  {stats?.itemsCompleted || 0} de{" "}
                  {(stats?.itemsInProgress || 0) + (stats?.itemsCompleted || 0)}{" "}
                  itens
                </span>
              </div>
              <Progress value={getInventoriedPercentage()} className="h-2" />
            </div>

            {/* Tabela Principal - Ocupa Maior Espaço */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Controle de Itens
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Acompanhe o progresso de contagem por item
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por produto ou local..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="COMPLETED">Concluído</SelectItem>
                      <SelectItem value="DIVERGENT">Divergente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={divergenceFilter} onValueChange={setDivergenceFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-9">
                      <SelectValue placeholder="Divergências" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Situações</SelectItem>
                      <SelectItem value="divergent">Com Divergência</SelectItem>
                      <SelectItem value="needs_count3">Precisa 3ª Contagem</SelectItem>
                      <SelectItem value="no_divergence">Sem Divergência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("product")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Produto</span>
                            {getSortIcon("product")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("location")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Local de Estoque</span>
                            {getSortIcon("location")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("expectedQuantity")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Qtd. Estoque</span>
                            {getSortIcon("expectedQuantity")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("count1")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>C1</span>
                            {getSortIcon("count1")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("count2")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>C2</span>
                            {getSortIcon("count2")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("count3")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>C3</span>
                            {getSortIcon("count3")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("count4")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>C4</span>
                            {getSortIcon("count4")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("finalQuantity")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Qtd. Final</span>
                            {getSortIcon("finalQuantity")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("difference")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Diferença</span>
                            {getSortIcon("difference")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Status</span>
                            {getSortIcon("status")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {getProductName(item.productId)}
                          </TableCell>
                          <TableCell>
                            {getLocationName(item.locationId)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.expectedQuantity}
                          </TableCell>
                          <TableCell className="text-center">
                            <CountIndicator
                              count={item.count1}
                              countBy={item.count1By?.toString()}
                              countAt={item.count1At}
                              stage="C1"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <CountIndicator
                              count={item.count2}
                              countBy={item.count2By?.toString()}
                              countAt={item.count2At}
                              stage="C2"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <CountIndicator
                              count={item.count3}
                              countBy={item.count3By?.toString()}
                              countAt={item.count3At}
                              stage="C3"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {isAuditMode && hasAuditAccess() ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
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
                                    editingCount4[item.id] === undefined ||
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
                          <TableCell className="text-center">
                            {item.finalQuantity !== undefined ? (
                              <span className="font-bold">
                                {item.finalQuantity}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.count1 !== undefined && item.count2 !== undefined ? (
                              <div className="flex flex-col items-center gap-1">
                                {hasDiscrepancy(item) ? (
                                  <>
                                    <Badge variant="destructive" className="text-xs">
                                      Divergente
                                    </Badge>
                                    {needsThirdCount(item) && (
                                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                        Precisa C3
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    Conforme
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                item.status === "COMPLETED"
                                  ? "default"
                                  : item.status === "IN_PROGRESS"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {(selectedInventory.status === "count1_open" && item.count1 !== null ||
                                selectedInventory.status === "count2_open" && item.count2 !== null
                              )
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

                <div className="flex justify-between items-center m-4 pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex gap-6">
                    <span>
                      Total de Itens:{" "}
                      <strong className="text-foreground">
                        {filteredItems.length}
                      </strong>
                    </span>
                    <span>
                      Concluídos:{" "}
                      <strong className="text-foreground">
                        {
                          filteredItems.filter(
                            (item) =>
                              (selectedInventory.status === "count1_open" && item.count1 !== undefined && item.count1 !== null) ||
                              (selectedInventory.status === "count2_open" && item.count2 !== undefined && item.count2 !== null) ||
                              (selectedInventory.status === "count3_open" && item.count3 !== undefined && item.count3 !== null),
                          ).length
                        }
                      </strong>
                    </span>
                  </div>
                  <div className="flex gap-6">
                    <span>
                      Com Divergência:{" "}
                      <strong className="text-red-600">
                        {filteredItems.filter(hasDiscrepancy).length}
                      </strong>
                    </span>
                    <span>
                      Precisam 3ª Contagem:{" "}
                      <strong className="text-orange-600">
                        {filteredItems.filter(needsThirdCount).length}
                      </strong>
                    </span>
                    <span>
                      Acuracidade Média:{" "}
                      <strong className="text-foreground">
                        {stats?.accuracyRate?.toFixed(1) || 0}%
                      </strong>
                    </span>
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
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("product")}
                              >
                                <div className="flex items-center gap-1">
                                  Produto
                                  {getSortIcon("product")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("location")}
                              >
                                <div className="flex items-center gap-1">
                                  Local
                                  {getSortIcon("location")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("expectedQuantity")}
                              >
                                <div className="flex items-center gap-1">
                                  Estoque
                                  {getSortIcon("expectedQuantity")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("count1")}
                              >
                                <div className="flex items-center gap-1">
                                  C1
                                  {getSortIcon("count1")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("count2")}
                              >
                                <div className="flex items-center gap-1">
                                  C2
                                  {getSortIcon("count2")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("count3")}
                              >
                                <div className="flex items-center gap-1">
                                  C3
                                  {getSortIcon("count3")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("count4")}
                              >
                                <div className="flex items-center gap-1">
                                  C4 (Auditoria)
                                  {getSortIcon("count4")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("finalQuantity")}
                              >
                                <div className="flex items-center gap-1">
                                  Qtd. Final
                                  {getSortIcon("finalQuantity")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort("status")}
                              >
                                <div className="flex items-center gap-1">
                                  Status
                                  {getSortIcon("status")}
                                </div>
                              </TableHead>
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
                                      step="1"
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
                                        editingCount4[item.id] === undefined ||
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
                                    variant={getItemStatusBadge(item.status).variant}
                                  >
                                    {getItemStatusBadge(item.status).label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-4 flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() =>
                            selectedInventoryId &&
                            confirmAllItemsMutation.mutate(selectedInventoryId)
                          }
                          disabled={
                            confirmAllItemsMutation.isPending ||
                            !inventoryItems?.some(
                              (item) =>
                                item.finalQuantity !== null &&
                                item.finalQuantity !== undefined,
                            )
                          }
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {confirmAllItemsMutation.isPending
                            ? "Confirmando..."
                            : "Confirmar Todos com Quantidades Atuais"}
                        </Button>
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
          <Card className="flex-1">
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
