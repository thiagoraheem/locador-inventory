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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Package,
  LogOut,
  ArrowLeft,
  AlertTriangle,
  Barcode,
  Loader2,
  Trash2,
  RefreshCcw,
  Eye,
  Menu,
  Settings,
  BarChart3,
  History,
  Home,
  MapPin,
  User,
  Scan,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import ProductSearchCombobox from "@/components/product-search-combobox";
import type {
  Inventory,
  InventoryItem,
  Product,
  Location,
} from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Command, CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface para produtos contados na nova estrutura dual
interface CountedProduct {
  productId: number;
  productName: string;
  productSku: string;
  locationId: number;
  locationName: string;
  hasSerialControl: boolean;
  countStage: number; // Estágio de contagem em que o produto foi lido

  // Para produtos sem série (quantidade manual)
  manualQuantity?: number;

  // Para produtos com série (números individuais)
  serialNumbers?: string[];
  totalSerialCount?: number;
}

// Interface para produto pesquisado
interface SearchedProduct {
  id: number;
  sku: string;
  name: string;
  categoryName: string;
  hasSerialControl: boolean;
}

export default function MobileCounting() {
  // Estado principal para interface dual
  const { selectedInventoryId, setSelectedInventoryId } =
    useSelectedInventory();
  const [serialInput, setSerialInput] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<SearchedProduct | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);

  // Chave para localStorage baseada no inventário, usuário e estágio de contagem
  const getStorageKey = () => {
    const stage = getCurrentCountStage();
    return `mobile-counting-${selectedInventoryId}-${currentUser?.id || 'anonymous'}-stage${stage}`;
  };

  // Salvar dados no localStorage
  const saveToLocalStorage = (products: CountedProduct[]) => {
    if (selectedInventoryId && currentUser?.id) {
      localStorage.setItem(getStorageKey(), JSON.stringify(products));
    }
  };

  // Carregar dados do localStorage
  const loadFromLocalStorage = (): CountedProduct[] => {
    if (selectedInventoryId && currentUser?.id) {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Migração: adicionar countStage para produtos existentes que não possuem
          return parsed.map((product: any) => ({
            ...product,
            countStage: product.countStage || currentCountStage
          }));
        } catch (error) {
          console.error('Erro ao carregar dados do localStorage:', error);
        }
      }
    }
    return [];
  };

  // Limpar dados do localStorage
  const clearLocalStorage = () => {
    if (selectedInventoryId && currentUser?.id) {
      localStorage.removeItem(getStorageKey());
    }
  };
  const [activeTab, setActiveTab] = useState<"serial" | "sku">("serial");
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAddData, setPendingAddData] = useState<{
    product: SearchedProduct;
    quantity: number;
    locationId: number;
  } | null>(null);
  
  // Estados para diálogo de confirmação de local diferente
  
  // Novos estados para melhorias mobile
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [countingProgress, setCountingProgress] = useState(0);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [currentCountStage, setCurrentCountStage] = useState<number>(1);
  const [pendingSerialData, setPendingSerialData] = useState<{
    serialNumber: string;
    productId: number;
    productName: string;
    productSku: string;
    actualLocationId: number;
    actualLocationName: string;
    expectedLocationId: number;
  } | null>(null);

  const { toast } = useToast();

  // Fetch current user information
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all active inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Fetch products with serial control information
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch locations
  const { data: locations } = useQuery<any[]>({
    queryKey: ["/api/locations"],
  });

  // Fetch selected inventory details
  const { data: selectedInventoryDetails } = useQuery<Inventory>({
    queryKey: ["/api/inventories", selectedInventoryId],
    enabled: !!selectedInventoryId,
  });

  // Fetch user's serial readings for current inventory
  const { data: userSerialReadings } = useQuery<any[]>({
    queryKey: ["/api/inventories", selectedInventoryId, "serial-items", "user", currentUser?.id],
    queryFn: async () => {
      if (!selectedInventoryId || !currentUser?.id) return [];
      const response = await fetch(
        `/api/inventories/${selectedInventoryId}/serial-items?userId=${currentUser.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error('Failed to fetch user serial readings');
      return response.json();
    },
    enabled: !!selectedInventoryId && !!currentUser?.id,
  });

  // Get active inventories that can be counted
  const activeInventories =
    inventories?.filter((inv) =>
      ["open", "count1_open", "count2_open", "count3_open"].includes(
        inv.status,
      ),
    ) || [];

  // Reset selected location when inventory changes
  useEffect(() => {
    // Reset selected location when inventory changes
    setSelectedLocationId(null);
    // Limpar produtos contados quando trocar de inventário
    setCountedProducts([]);
    // Limpar dados antigos do localStorage
    if (selectedInventoryId && currentUser?.id) {
      clearLocalStorage();
    }
  }, [selectedInventoryId]);

  // Carregar dados persistidos na inicialização
  useEffect(() => {
    if (selectedInventoryId && currentUser?.id) {
      // Inicializar o estágio atual
      const stage = getCurrentCountStage();
      setCurrentCountStage(stage);
      
      // Primeiro, tentar carregar do localStorage
      const localData = loadFromLocalStorage();
      if (localData.length > 0) {
        setCountedProducts(localData);
      }
    }
  }, [selectedInventoryId, currentUser?.id, inventories]);

  // Sincronizar com dados do servidor quando disponíveis
  useEffect(() => {
    if (userSerialReadings && userSerialReadings.length > 0 && products) {
      const serverProducts: CountedProduct[] = [];
      const currentStage = getCurrentCountStage();
      
      // Agrupar leituras por produto
      const groupedReadings = userSerialReadings.reduce((acc, reading) => {
        // Verificar se a leitura é do estágio atual
        const isCurrentStage = reading[`count${currentStage}_found`] && 
                              reading[`count${currentStage}_by`] == currentUser?.id;
        
        if (isCurrentStage) {
          const key = `${reading.productId}-${reading.locationId}`;
          if (!acc[key]) {
            acc[key] = {
              productId: reading.productId,
              locationId: reading.locationId,
              serialNumbers: []
            };
          }
          acc[key].serialNumbers.push(reading.serialNumber);
        }
        return acc;
      }, {} as Record<string, any>);

      // Converter para CountedProduct
      Object.values(groupedReadings).forEach((group: any) => {
        const product = products.find(p => p.id === group.productId);
        const location = locations?.find(l => l.id === group.locationId);
        
        if (product) {
          serverProducts.push({
            productId: group.productId,
            productName: product.name,
            productSku: product.sku,
            locationId: group.locationId,
            locationName: location?.name || '',
            hasSerialControl: true,
            serialNumbers: group.serialNumbers,
            totalSerialCount: group.serialNumbers.length,
            countStage: currentCountStage
          });
        }
      });

      // Mesclar com dados locais, priorizando dados do servidor
      setCountedProducts(prevLocal => {
        const merged = [...serverProducts];
        
        // Adicionar produtos locais que não estão no servidor
        prevLocal.forEach(localProduct => {
          const existsInServer = serverProducts.some(sp => 
            sp.productId === localProduct.productId && 
            sp.locationId === localProduct.locationId
          );
          
          if (!existsInServer) {
            merged.push(localProduct);
          }
        });
        
        return merged;
      });
    }
  }, [userSerialReadings, products, locations, currentUser?.id]);

  // Detectar mudanças no estágio de contagem e limpar lista quando necessário
  useEffect(() => {
    const newStage = getCurrentCountStage();
    if (currentCountStage !== newStage) {
      // Limpar produtos contados quando muda o estágio
      setCountedProducts([]);
      clearLocalStorage();
      setCurrentCountStage(newStage);
    }
  }, [selectedInventoryId, inventories, currentCountStage]);

  // Salvar no localStorage sempre que countedProducts mudar
  useEffect(() => {
    saveToLocalStorage(countedProducts);
  }, [countedProducts, selectedInventoryId, currentUser?.id]);

  // Get current counting stage based on inventory status
  const getCurrentCountStage = () => {
    const selectedInv = inventories?.find(
      (inv) => inv.id === selectedInventoryId,
    );
    if (!selectedInv) return 1;

    // Cast to any to avoid TypeScript errors with extended status types
    const status = selectedInv.status as any;

    switch (status) {
      case "open":
      case "count1_open":
        return 1;
      case "count1_closed":
      case "count2_open":
        return 2;
      case "count2_closed":
      case "count3_open":
        return 3;
      default:
        return 1;
    }
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

  // Calcular progresso da contagem
  const calculateProgress = () => {
    if (!selectedInventoryDetails?.items) return 0;
    
    const totalItems = selectedInventoryDetails.items.length;
    const countedItems = countedProducts.length;
    
    return totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;
  };

  // Atualizar progresso quando produtos contados mudarem
  useEffect(() => {
    setCountingProgress(calculateProgress());
  }, [countedProducts, selectedInventoryDetails]);

  // Função para leitura de número de série
  const handleSerialScan = async () => {
    if (!serialInput.trim() || !selectedInventoryId) return;

    // Verificar se inventário e local estão selecionados
    if (!selectedLocationId) {
      toast({
        title: "Local de estoque obrigatório",
        description:
          "Selecione um local de estoque antes de realizar a leitura.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o inventário permite contagem
    const selectedInv = inventories?.find(
      (inv) => inv.id === selectedInventoryId,
    );
    if (!selectedInv || !canPerformCounting(selectedInv.status)) {
      toast({
        title: "Contagem não permitida",
        description:
          "O inventário deve estar em status de contagem aberta (1ª, 2ª, 3ª ou 4ª contagem).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Primeiro, apenas verificar se a série existe e obter informações do produto
      // sem registrar a leitura ainda
      const response = await fetch(
        `/api/inventories/${selectedInventoryId}/serial-info`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            serialNumber: serialInput.trim(),
            countStage: `count${getCurrentCountStage()}`,
            locationFilter: selectedLocationId,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Verificar se o item está no local selecionado (se houver filtro)
        if (selectedLocationId && result.locationId !== selectedLocationId) {
          // Mostrar diálogo de confirmação para local diferente
          const expectedLocation = locations?.find((l) => l.id === selectedLocationId);
          setPendingSerialData({
            serialNumber: serialInput.trim(),
            productId: result.productId,
            productName: result.productName,
            productSku: result.productSku,
            actualLocationId: result.locationId,
            actualLocationName: result.locationName,
            expectedLocationId: selectedLocationId
          });
          setShowLocationDialog(true);
          setSerialInput("");
          setIsLoading(false);
          return;
        }

        // Se o local está correto, registrar a leitura imediatamente
        await registerSerialReading(serialInput.trim(), result);
      } else if (result.alreadyRead) {
        toast({
          title: "Série já registrada",
          description: "Esta série já foi lida neste estágio",
          variant: "destructive",
        });
      } else if (result.newSerial) {
        toast({
          title: "Série não encontrada",
          description: "Número de série não existe no sistema",
          variant: "destructive",
        });
      } else {
        // Erro genérico não identificado
        toast({
          title: "Erro na leitura",
          description: result.message || "Falha ao registrar número de série",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na leitura",
        description: "Falha ao registrar número de série",
        variant: "destructive",
      });
    } finally {
      setSerialInput("");
      setIsLoading(false);
    }
  };

  // Função para adicionar produto selecionado com quantidade manual
  const handleAddSelectedProduct = async () => {
    if (
      !selectedProduct ||
      quantityInput === null ||
      quantityInput === undefined ||
      quantityInput < 0 ||
      !selectedInventoryId
    ) {
      /*toast({
        title: "Dados incompletos",
        description: "Selecione um produto e informe uma quantidade válida",
        variant: "destructive",
      });*/
      return;
    }

    // Verificar se inventário e local estão selecionados
    if (!selectedLocationId) {
      toast({
        title: "Local de estoque obrigatório",
        description:
          "Selecione um local de estoque antes de adicionar produtos.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o produto já foi registrado neste estágio de contagem
    const currentStage = getCurrentCountStage();
    const existingProduct = countedProducts.find(
      (p) => p.productId === selectedProduct.id && 
           p.locationId === selectedLocationId &&
           p.manualQuantity !== undefined
    );
    
    if (existingProduct) {
      toast({
        title: "Produto já registrado",
        description: `${selectedProduct.name} já foi registrado no ${getStageLabel(currentStage)} com quantidade ${existingProduct.manualQuantity}. Não é possível sobrescrever a quantidade.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se produto tem controle de série
      if (selectedProduct.hasSerialControl) {
        toast({
          title: "Produto com controle de série",
          description: "Use a leitura de código de barras para este produto",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Registrar contagem manual
      const result = await registerManualCount(
        selectedProduct.id,
        quantityInput,
      );

      // Se precisa de confirmação, mostrar diálogo
      if (result.needsConfirmation) {
        setPendingAddData({
          product: selectedProduct,
          quantity: quantityInput,
          locationId: selectedLocationId,
        });
        setShowConfirmDialog(true);
        setIsLoading(false);
        return;
      }

      // Sucesso - adicionar à lista local e mostrar toast
      addManualProduct(selectedProduct, quantityInput);

      toast({
        title: result.added
          ? "Produto adicionado ao inventário"
          : "Contagem registrada",
        description: `${selectedProduct.name} - Qtd: ${quantityInput}`,
      });

      // Limpar campos após sucesso
      setSelectedProduct(null);
      setQuantityInput(1);
    } catch (error) {
      // Erro ao adicionar produto
      toast({
        title: "Erro ao adicionar",
        description:
          error instanceof Error ? error.message : "Falha ao adicionar produto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para confirmar adição de produto não encontrado
  const handleConfirmAdd = async () => {
    if (!pendingAddData) return;

    setIsLoading(true);
    try {
      const result = await registerManualCount(
        pendingAddData.product.id,
        pendingAddData.quantity,
        true, // confirmAdd = true
      );

      addManualProduct(pendingAddData.product, pendingAddData.quantity);

      toast({
        title: "Produto adicionado ao inventário",
        description: `${pendingAddData.product.name} - Qtd: ${pendingAddData.quantity}`,
      });

      // Limpar campos após sucesso
      setSelectedProduct(null);
      setQuantityInput(1);
      setShowConfirmDialog(false);
      setPendingAddData(null);
    } catch (error) {
      // Erro ao confirmar adição
      toast({
        title: "Erro ao adicionar",
        description:
          error instanceof Error ? error.message : "Falha ao adicionar produto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para cancelar adição
  const handleCancelAdd = () => {
    setShowConfirmDialog(false);
    setPendingAddData(null);
  };

  // Função auxiliar para registrar a leitura de série
  const registerSerialReading = async (serialNumber: string, productInfo: any) => {
    try {
      const response = await fetch(
        `/api/inventories/${selectedInventoryId}/serial-reading`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            serialNumber: serialNumber,
            countStage: `count${getCurrentCountStage()}`,
            scannedLocationId: productInfo.locationId, // Incluir o local onde a série foi encontrada
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Adicionar à lista de produtos contados
        addSerialToProduct(
          productInfo.productId,
          productInfo.productName,
          productInfo.productSku,
          serialNumber,
          productInfo.locationId,
          productInfo.locationName,
        );

        // Atualizar histórico
        setRecentScans((prev) => [serialNumber, ...prev.slice(0, 4)]);

        toast({
          title: "Série registrada",
          description: `${productInfo.productName} - ${serialNumber} (${productInfo.locationName})`,
        });
      } else {
        throw new Error(result.message || "Falha ao registrar número de série");
      }
    } catch (error) {
      throw error;
    }
  };

  // Função para confirmar leitura em local diferente
  const handleConfirmLocationReading = async () => {
    if (!pendingSerialData || !selectedInventoryId) return;

    setIsLoading(true);
    try {
      // Registrar a leitura no local correto
      await registerSerialReading(pendingSerialData.serialNumber, {
        productId: pendingSerialData.productId,
        productName: pendingSerialData.productName,
        productSku: pendingSerialData.productSku,
        locationId: pendingSerialData.actualLocationId,
        locationName: pendingSerialData.actualLocationName,
      });

      // Limpar dados pendentes
      setShowLocationDialog(false);
      setPendingSerialData(null);
    } catch (error) {
      toast({
        title: "Erro na leitura",
        description: error instanceof Error ? error.message : "Falha ao registrar número de série",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para cancelar leitura de local diferente
  const handleCancelLocationReading = () => {
    setShowLocationDialog(false);
    setPendingSerialData(null);
  };

  // Função para adicionar produto por série à lista
  const addSerialToProduct = (
    productId: number,
    productName: string,
    productSku: string,
    serialNumber: string,
    locationId?: number,
    locationName?: string,
  ) => {
    setCountedProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.productId === productId);

      if (existingIndex >= 0) {
        // Produto já existe, adicionar série
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          serialNumbers: [
            ...(updated[existingIndex].serialNumbers || []),
            serialNumber,
          ],
          totalSerialCount: (updated[existingIndex].totalSerialCount || 0) + 1,
        };
        return updated;
      } else {
        // Novo produto
        return [
          ...prev,
          {
            productId,
            productName,
            productSku,
            locationId: locationId || 0,
            locationName: locationName || "",
            hasSerialControl: true,
            serialNumbers: [serialNumber],
            totalSerialCount: 1,
          },
        ];
      }
    });
  };

  // Função para adicionar produto manual à lista
  const addManualProduct = (product: SearchedProduct, quantity: number) => {
    setCountedProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.productId === product.id);

      if (existingIndex >= 0) {
        // Produto já existe, somar quantidade
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          manualQuantity:
            (updated[existingIndex].manualQuantity || 0) + quantity,
        };
        return updated;
      } else {
        // Novo produto
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            locationId: 0,
            locationName: "",
            hasSerialControl: false,
            manualQuantity: quantity,
            countStage: currentCountStage,
          },
        ];
      }
    });
  };

  // Função para verificar se o inventário permite contagem
  const canPerformCounting = (status: string): boolean => {
    return [
      "count1_open",
      "count2_open",
      "count3_open",
      "count4_open",
    ].includes(status);
  };

  // Função para registrar contagem manual (tradicional)
  const registerManualCount = async (
    productId: number,
    quantity: number,
    confirmAdd: boolean = false,
  ) => {
    // Verificar se o inventário está em status de contagem aberta
    const selectedInv = inventories?.find(
      (inv) => inv.id === selectedInventoryId,
    );
    if (!selectedInv || !canPerformCounting(selectedInv.status)) {
      throw new Error(
        "Contagem não permitida. O inventário deve estar em status de contagem aberta (1ª, 2ª, 3ª ou 4ª contagem).",
      );
    }

    if (!selectedLocationId) {
      throw new Error("Local de estoque obrigatório");
    }

    try {
      const response = await fetch(
        `/api/inventories/${selectedInventoryId}/manual-count`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productId,
            locationId: selectedLocationId,
            quantity,
            countStage: getCurrentCountStage().toString(),
            confirmAdd,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Se o produto não foi encontrado e precisa de confirmação
        if (
          response.status === 404 &&
          errorData.code === "ITEM_NOT_FOUND" &&
          errorData.needsConfirmation
        ) {
          return {
            needsConfirmation: true,
            message: errorData.message,
            productId: errorData.productId,
            locationId: errorData.locationId,
          };
        }

        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Auto-select first available inventory if none selected
  useEffect(() => {
    if (!selectedInventoryId && activeInventories.length > 0) {
      setSelectedInventoryId(activeInventories[0].id);
    }
  }, [activeInventories, selectedInventoryId]);

  const selectedInventory = inventories?.find(
    (inv) => inv.id === selectedInventoryId,
  );
  const currentStage = selectedInventory ? getCurrentCountStage() : 1;

  // Fetch divergent items count for 3rd counting stage
  const { data: divergentItems } = useQuery<any[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items/divergent`],
    enabled:
      !!selectedInventoryId && selectedInventory?.status === "count3_open",
  });

  // Get total items count for mobile display
  const getItemsCountDisplay = () => {
    if (selectedInventory?.status === "count3_open" && divergentItems) {
      return `${divergentItems.length} itens divergentes`;
    }
    return "Contagem móvel ativa";
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer logout");
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();

      // Clear any local storage items if they exist
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema.",
      });

      // Force redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: () => {
      // Even if logout fails on server, clear client state and redirect
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado do sistema.",
      });

      // Force redirect to login
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 
                    portrait:px-3 portrait:py-2 landscape:px-2 landscape:py-1 
                    sm:portrait:px-4 sm:portrait:py-3 sm:landscape:px-3 sm:landscape:py-2
                    md:px-6 md:py-4">
      {/* Header com Progress e Drawer */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          {/* Menu Drawer */}
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {currentUser?.name || "Usuário"}
                </DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2 pb-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.location.href = "/dashboard";
                      setIsDrawerOpen(false);
                    }}
                  >
                    <Home className="h-5 w-5" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.location.href = "/inventory-control-board";
                      setIsDrawerOpen(false);
                    }}
                  >
                    <BarChart3 className="h-5 w-5" />
                    Mesa de Controle
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      window.location.href = "/inventory-history";
                      setIsDrawerOpen(false);
                    }}
                  >
                    <History className="h-5 w-5" />
                    Histórico
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <Settings className="h-5 w-5" />
                    Configurações
                  </Button>
                  {/* Botão Sair - apenas para usuários Contador */}
                  {(currentUser?.profile === "Contador" ||
                    currentUser?.profile === "contador" ||
                    currentUser?.role === "Contador" ||
                    currentUser?.role === "contador") && (
                    <Button
                      variant="destructive"
                      className="w-full justify-start gap-3 h-12 mt-4"
                      onClick={() => {
                        logoutMutation.mutate();
                        setIsDrawerOpen(false);
                      }}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="h-5 w-5" />
                      {logoutMutation.isPending ? "Saindo..." : "Sair"}
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          {/* Título e Usuário */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-lg md:text-xl font-bold text-white">Contagem Mobile</h1>
            {currentUser && (
              <p className="text-sm text-blue-200 mt-1">
                Usuário: {currentUser.name || currentUser.username}
              </p>
            )}
            {selectedInventory?.status === "count3_open" && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Apenas itens divergentes
                </Badge>
                <span className="text-sm text-blue-200">
                  {getItemsCountDisplay()}
                </span>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {/* Busca Command */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 hidden md:flex"
              onClick={() => setIsCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Configurações Sheet */}
            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Configurações</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Progresso da Contagem</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Produtos contados:</span>
                        <span>{countedProducts.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total de itens:</span>
                        <span>{selectedInventoryDetails?.items?.length || 0}</span>
                      </div>
                      <Progress value={countingProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {countingProgress}% concluído
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Ações</h4>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        clearLocalStorage();
                        setCountedProducts([]);
                        setIsSettingsOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar dados locais
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Progress Bar */}
        {selectedInventoryId && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-white/80 mb-1">
              <span>{getStageLabel(currentStage)}</span>
              <span>{countedProducts.length} / {selectedInventoryDetails?.items?.length || 0} itens</span>
            </div>
            <Progress 
              value={countingProgress} 
              className="h-2 bg-white/20" 
            />
          </div>
        )}
      </div>

      <>
        {/* Inventory Selection */}
        <Card className="bg-blue-500/30 border-blue-400 dark:bg-blue-800/30 dark:border-blue-700 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="text-white">
                  <label className="block text-sm font-medium mb-2">
                    Inventário:
                  </label>
                  <Select
                    value={selectedInventoryId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedInventoryId(Number(value))
                    }
                  >
                    <SelectTrigger className="bg-blue-700 border-blue-600 dark:bg-blue-800 dark:border-blue-700 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeInventories.map((inventory) => (
                        <SelectItem
                          key={inventory.id}
                          value={inventory.id.toString()}
                        >
                          {inventory.code} -{" "}
                          {inventory.description || "Sem descrição"} -{" "}
                          {getStageLabel(getCurrentCountStage())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-white">
                    <label className="block text-sm font-medium mb-2">
                      Estágio:
                    </label>
                    <div className="bg-blue-700 dark:bg-blue-800 rounded px-3 py-2 text-center font-semibold">
                      {getStageLabel(currentStage)}
                    </div>
                  </div>

                  <div className="text-white">
                    <label className="block text-sm font-medium mb-2">
                      Local de Estoque: <span className="text-red-300">*</span>
                    </label>
                    <Select
                      value={selectedLocationId?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedLocationId(value ? Number(value) : null)
                      }
                    >
                      <SelectTrigger
                        className={`bg-blue-700 border-blue-600 dark:bg-blue-800 dark:border-blue-700 text-white ${!selectedLocationId ? "border-red-400" : ""}`}
                      >
                        <SelectValue placeholder="Selecione um local..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations
                          ?.filter((location) => {
                            // Se não há inventário selecionado ou o inventário não tem locais selecionados, mostrar todos
                            if (
                              !selectedInventoryDetails ||
                              !selectedInventoryDetails.selectedLocationIds ||
                              selectedInventoryDetails.selectedLocationIds
                                .length === 0
                            ) {
                              return true;
                            }
                            // Filtrar apenas os locais selecionados na criação do inventário
                            return selectedInventoryDetails.selectedLocationIds.includes(
                              location.id,
                            );
                          })
                          .map((location) => (
                            <SelectItem
                              key={location.id}
                              value={location.id.toString()}
                            >
                              {location.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {!selectedLocationId && (
                      <p className="text-red-300 text-xs mt-1">
                        Local obrigatório para realizar contagem
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        <div className="space-y-4 mb-6 portrait:space-y-3 landscape:space-y-2 sm:space-y-4">
          {/* Tabs otimizadas para touch - Botões maiores e mais espaçados */}
          <div className="grid grid-cols-2 gap-3">
          <Button
            variant={activeTab === "serial" ? "default" : "outline"}
            onClick={() => setActiveTab("serial")}
            size="lg"
            className={`flex items-center justify-center gap-3 h-14 text-base font-medium transition-all duration-200 ${
              activeTab === "serial"
                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg scale-105"
                : "bg-white/20 text-white border-white/30 hover:bg-white/30 hover:scale-102"
            }`}
          >
            <Barcode className="h-5 w-5" />
            <span className="hidden sm:inline">Leitura de Série</span>
            <span className="sm:hidden">Série</span>
          </Button>
          <Button
            variant={activeTab === "sku" ? "default" : "outline"}
            onClick={() => setActiveTab("sku")}
            size="lg"
            className={`flex items-center justify-center gap-3 h-14 text-base font-medium transition-all duration-200 ${
              activeTab === "sku"
                ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg scale-105"
                : "bg-white/20 text-white border-white/30 hover:bg-white/30 hover:scale-102"
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="hidden sm:inline">Busca por SKU</span>
            <span className="sm:hidden">SKU</span>
          </Button>
          </div>
        </div>

        {/* Campo de leitura de série */}
        {activeTab === "serial" && (
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
                <Barcode className="h-5 w-5" />
                Leitura de Número de Série
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Escaneie o código de barras..."
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSerialScan()}
                  className="flex-1 text-lg"
                  autoFocus={activeTab === "serial"}
                  inputMode="numeric"
                />
                <Button
                  onClick={handleSerialScan}
                  disabled={
                    !serialInput.trim() || isLoading || !selectedLocationId
                  }
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 h-12 px-6 text-base font-medium"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Scan className="h-5 w-5 mr-2" />
                      Ler
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                Escaneie o código de barras do produto para identificação
                automática
                {!selectedLocationId && (
                  <span className="block text-red-500 dark:text-red-400 text-xs mt-1">
                    ⚠️ Selecione um local de estoque para habilitar a leitura
                  </span>
                )}
              </p>

              {/* Histórico de últimas leituras */}
              {recentScans.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Últimas leituras:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recentScans.slice(0, 3).map((scan, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {scan}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Campo de busca por SKU */}
        {activeTab === "sku" && (
          <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                <Search className="h-5 w-5" />
                Buscar Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ProductSearchCombobox
                  value={selectedProduct}
                  onSelect={(product) => {
                    setSelectedProduct(product);
                    // Removido o auto-registro - agora só registra quando clicar no botão
                  }}
                  placeholder="Buscar por SKU/Descrição..."
                  className="w-full"
                />

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Quantidade"
                    value={quantityInput || ""}
                    onChange={(e) => setQuantityInput(Number(e.target.value))}
                    onKeyPress={(e) => {
                      if (
                        e.key === "Enter" &&
                        selectedProduct &&
                        quantityInput >= 0
                      ) {
                        handleAddSelectedProduct();
                      }
                    }}
                    className="w-24"
                  />
                  <Button
                    onClick={handleAddSelectedProduct}
                    disabled={
                      !selectedProduct ||
                      quantityInput === null ||
                      quantityInput === undefined ||
                      isLoading ||
                      !selectedLocationId
                    }
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex-1 h-12 text-base font-medium"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Registrar
                      </>
                    )}
                  </Button>
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="font-medium text-green-800 dark:text-green-400">
                      {selectedProduct.name}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-500">
                      {selectedProduct.categoryName} • SKU:{" "}
                      {selectedProduct.sku}
                    </div>
                    {selectedProduct.hasSerialControl && (
                      <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded mt-1 inline-block">
                        ⚠️ Produto com controle de série - Use a leitura de
                        código
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Busque por código SKU ou descrição e informe a quantidade
                {!selectedLocationId && (
                  <span className="block text-red-500 dark:text-red-400 text-xs mt-1">
                    ⚠️ Selecione um local de estoque para habilitar a adição
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </>

      {/* Lista de Produtos Contados */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
              <Package className="h-5 w-5" />
              Produtos Contados ({countedProducts.length})
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCountedProducts([]);
                  clearLocalStorage();
                }}
                disabled={countedProducts.length === 0}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/50"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {countedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto contado</p>
              <p className="text-sm">Use os métodos de entrada acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {countedProducts.map((product, index) => (
                <Card
                  key={`${product.productId}-${index}`}
                  className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight">
                          {product.productName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            SKU: {product.productSku}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          >
                            {getStageLabel(product.countStage)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Ações do Card - Botões maiores para touch */}
                      <div className="flex gap-2 ml-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/50"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCountedProducts((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="h-10 w-10 p-0 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações de Contagem */}
                    <div className="space-y-3">
                      {product.hasSerialControl ? (
                        <>
                          {/* Badge de Contagem de Séries */}
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className="text-sm px-3 py-1 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
                            >
                              <Barcode className="h-4 w-4 mr-2" />
                              {product.totalSerialCount} {product.totalSerialCount === 1 ? 'série' : 'séries'}
                            </Badge>
                          </div>

                          {/* Lista de Séries - Layout otimizado para mobile */}
                          {product.serialNumbers && product.serialNumbers.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Números de Série:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {product.serialNumbers
                                  ?.slice(0, 6)
                                  .map((serial, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs px-2 py-1 font-mono"
                                    >
                                      {serial}
                                    </Badge>
                                  ))}
                                {(product.serialNumbers?.length || 0) > 6 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-2 py-1 bg-white dark:bg-gray-700"
                                  >
                                    +{(product.serialNumbers?.length || 0) - 6} mais
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className="text-sm px-3 py-1 bg-green-50 dark:bg-green-950 dark:border-green-800"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Qtd: {product.manualQuantity}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Produto não encontrado no inventário
            </AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{pendingAddData?.product.name}</strong> (SKU:{" "}
              {pendingAddData?.product.sku}) não foi encontrado neste inventário
              para o local selecionado.
              <br />
              <br />
              Deseja confirmar a inclusão deste produto no inventário com
              quantidade <strong>{pendingAddData?.quantity}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAdd} disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAdd}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Inclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Confirmação para Local Diferente */}
      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              Item em local diferente
            </AlertDialogTitle>
            <AlertDialogDescription>
              O número de série <strong>{pendingSerialData?.serialNumber}</strong> do produto{" "}
              <strong>{pendingSerialData?.productName}</strong> (SKU: {pendingSerialData?.productSku})
              pertence ao local <strong>{pendingSerialData?.actualLocationName}</strong>,
              mas você selecionou o local{" "}
              <strong>{locations?.find(l => l.id === pendingSerialData?.expectedLocationId)?.name}</strong>.
              <br />
              <br />
              Deseja continuar com a leitura no local atual do item ou cancelar para
              ajustar o local selecionado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLocationReading} disabled={isLoading}>
              Cancelar Leitura
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLocationReading}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Continuar Leitura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Command Dialog para busca inteligente */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput 
          placeholder="Buscar produtos, locais ou ações..." 
          value={commandQuery}
          onValueChange={setCommandQuery}
        />
        <CommandList>
          <CommandGroup heading="Produtos">
            {products
              ?.filter(product => 
                product.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                product.sku.toLowerCase().includes(commandQuery.toLowerCase())
              )
              .slice(0, 5)
              .map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => {
                    setSelectedProduct({
                      id: product.id,
                      sku: product.sku,
                      name: product.name,
                      categoryName: product.categoryName || '',
                      hasSerialControl: product.hasSerialControl
                    });
                    setActiveTab('sku');
                    setIsCommandOpen(false);
                    setCommandQuery('');
                  }}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.sku}</span>
                  </div>
                </CommandItem>
              ))
            }
          </CommandGroup>
          
          <CommandGroup heading="Locais">
            {locations
              ?.filter(location => 
                location.name.toLowerCase().includes(commandQuery.toLowerCase())
              )
              .slice(0, 3)
              .map((location) => (
                <CommandItem
                  key={location.id}
                  onSelect={() => {
                    setSelectedLocationId(location.id);
                    setIsCommandOpen(false);
                    setCommandQuery('');
                  }}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {location.name}
                </CommandItem>
              ))
            }
          </CommandGroup>
          
          <CommandGroup heading="Ações">
            <CommandItem
              onSelect={() => {
                clearLocalStorage();
                setCountedProducts([]);
                setIsCommandOpen(false);
                setCommandQuery('');
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar dados locais
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setActiveTab('serial');
                setIsCommandOpen(false);
                setCommandQuery('');
              }}
            >
              <Scan className="mr-2 h-4 w-4" />
              Ir para Scanner
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
