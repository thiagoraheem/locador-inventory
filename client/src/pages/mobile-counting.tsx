import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, Package, Clock, CheckCircle, Target, Scan, ArrowLeft, AlertTriangle, Barcode, Loader2, Trash2, RefreshCcw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import Header from "@/components/layout/header";
import ProductSearchCombobox from "@/components/product-search-combobox";
import type { Inventory, InventoryItem, Product, Location } from "@shared/schema";

// Interface para produtos contados na nova estrutura dual
interface CountedProduct {
  productId: number;
  productName: string;
  productSku: string;
  locationId: number;
  locationName: string;
  hasSerialControl: boolean;

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
  const { selectedInventoryId, setSelectedInventoryId } = useSelectedInventory();
  const [serialInput, setSerialInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<SearchedProduct | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'serial' | 'sku'>('serial');
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const { toast } = useToast();

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

  // Get active inventories that can be counted
  const activeInventories = inventories?.filter(inv => 
    ['open', 'count1_open', 'count2_open', 'count3_open'].includes(inv.status)
  ) || [];
  
  // Reset selected location when inventory changes
  useEffect(() => {
    // Reset selected location when inventory changes
    setSelectedLocationId(null);
  }, [selectedInventoryId]);

  // Get current counting stage based on inventory status
  const getCurrentCountStage = () => {
    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv) return 1;

    // Cast to any to avoid TypeScript errors with extended status types
    const status = selectedInv.status as any;

    switch (status) {
      case 'open':
      case 'count1_open':
        return 1;
      case 'count1_closed':
      case 'count2_open':
        return 2;
      case 'count2_closed':
      case 'count3_open':
        return 3;
      default:
        return 1;
    }
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return "1ª Contagem";
      case 2: return "2ª Contagem";
      case 3: return "3ª Contagem";
      default: return `${stage}ª Contagem`;
    }
  };

  // Função para leitura de número de série
  const handleSerialScan = async () => {
    if (!serialInput.trim() || !selectedInventoryId) return;

    // Verificar se inventário e local estão selecionados
    if (!selectedLocationId) {
      toast({
        title: "Local de estoque obrigatório",
        description: "Selecione um local de estoque antes de realizar a leitura.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o inventário permite contagem
    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv || !canPerformCounting(selectedInv.status)) {
      toast({
        title: "Contagem não permitida",
        description: "O inventário deve estar em status de contagem aberta (1ª, 2ª, 3ª ou 4ª contagem).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventories/${selectedInventoryId}/serial-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serialNumber: serialInput.trim(),
          countStage: `count${getCurrentCountStage()}`,
          locationFilter: selectedLocationId
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Verificar se o item está no local selecionado (se houver filtro)
        if (selectedLocationId && result.locationId !== selectedLocationId) {
          toast({
            title: "Local incorreto",
            description: `Este item pertence a outro local de estoque. Local esperado: ${locations?.find(l => l.id === selectedLocationId)?.name}`,
            variant: "destructive",
          });
          return;
        }

        // Adicionar à lista de produtos contados
        addSerialToProduct(result.productId, result.productName, result.productSku, serialInput.trim(), result.locationId, result.locationName);

        // Atualizar histórico
        setRecentScans(prev => [serialInput.trim(), ...prev.slice(0, 4)]);

        toast({
          title: "Série registrada",
          description: `${result.productName} - ${serialInput} (${result.locationName})`,
        });
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
    if (!selectedProduct || !quantityInput || quantityInput <= 0 || !selectedInventoryId) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um produto e informe uma quantidade válida",
        variant: "destructive",
      });
      return;
    }

    // Verificar se inventário e local estão selecionados
    if (!selectedLocationId) {
      toast({
        title: "Local de estoque obrigatório",
        description: "Selecione um local de estoque antes de adicionar produtos.",
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
      await registerManualCount(selectedProduct.id, quantityInput);

      addManualProduct(selectedProduct, quantityInput);

      toast({
        title: "Produto adicionado",
        description: `${selectedProduct.name} - Qtd: ${quantityInput}`,
      });

      // Limpar campos após sucesso
      setSelectedProduct(null);
      setQuantityInput(1);

    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Falha ao adicionar produto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para adicionar produto por série à lista
  const addSerialToProduct = (productId: number, productName: string, productSku: string, serialNumber: string, locationId?: number, locationName?: string) => {
    setCountedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.productId === productId);

      if (existingIndex >= 0) {
        // Produto já existe, adicionar série
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          serialNumbers: [...(updated[existingIndex].serialNumbers || []), serialNumber],
          totalSerialCount: (updated[existingIndex].totalSerialCount || 0) + 1
        };
        return updated;
      } else {
        // Novo produto
        return [...prev, {
          productId,
          productName,
          productSku,
          locationId: locationId || 0,
          locationName: locationName || '',
          hasSerialControl: true,
          serialNumbers: [serialNumber],
          totalSerialCount: 1
        }];
      }
    });
  };

  // Função para adicionar produto manual à lista
  const addManualProduct = (product: SearchedProduct, quantity: number) => {
    setCountedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.productId === product.id);

      if (existingIndex >= 0) {
        // Produto já existe, somar quantidade
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          manualQuantity: (updated[existingIndex].manualQuantity || 0) + quantity
        };
        return updated;
      } else {
        // Novo produto
        return [...prev, {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          locationId: 0,
          locationName: '',
          hasSerialControl: false,
          manualQuantity: quantity
        }];
      }
    });
  };

  // Função para verificar se o inventário permite contagem
  const canPerformCounting = (status: string): boolean => {
    return ['count1_open', 'count2_open', 'count3_open', 'count4_open'].includes(status);
  };

  // Função para registrar contagem manual (tradicional)
  const registerManualCount = async (productId: number, quantity: number) => {
    // Verificar se o inventário está em status de contagem aberta
    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv || !canPerformCounting(selectedInv.status)) {
      throw new Error('Contagem não permitida. O inventário deve estar em status de contagem aberta (1ª, 2ª, 3ª ou 4ª contagem).');
    }

    try {
      const response = await fetch(`/api/inventories/${selectedInventoryId}/manual-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          quantity,
          countStage: `count${getCurrentCountStage()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao registrar contagem manual:', error);
      throw error;
    }
  };

  // Auto-select first available inventory if none selected
  useEffect(() => {
    if (!selectedInventoryId && activeInventories.length > 0) {
      setSelectedInventoryId(activeInventories[0].id);
    }
  }, [activeInventories, selectedInventoryId]);

  const selectedInventory = inventories?.find(inv => inv.id === selectedInventoryId);
  const currentStage = selectedInventory ? getCurrentCountStage() : 1;

  // Fetch divergent items count for 3rd counting stage
  const { data: divergentItems } = useQuery<any[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items/divergent`],
    enabled: !!selectedInventoryId && selectedInventory?.status === 'count3_open',
  });

  // Get total items count for mobile display
  const getItemsCountDisplay = () => {
    if (selectedInventory?.status === 'count3_open' && divergentItems) {
      return `${divergentItems.length} itens divergentes`;
    }
    return "Contagem móvel ativa";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 p-4">
      {/* Header */}
      <div className="text-white mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-blue-700 dark:hover:bg-blue-800"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Contagem Mobile</h1>
            {selectedInventory?.status === 'count3_open' && (
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
        </div>

        {/* Inventory Selection */}
        <Card className="bg-blue-500/30 border-blue-400 dark:bg-blue-800/30 dark:border-blue-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Inventário:</label>
                <Select 
                  value={selectedInventoryId?.toString() || ""} 
                  onValueChange={(value) => setSelectedInventoryId(Number(value))}
                >
                  <SelectTrigger className="bg-blue-700 border-blue-600 dark:bg-blue-800 dark:border-blue-700 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeInventories.map((inventory) => (
                      <SelectItem key={inventory.id} value={inventory.id.toString()}>
                        {inventory.code} - {getStageLabel(getCurrentCountStage())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-white">
                  <label className="block text-sm font-medium mb-2">Estágio:</label>
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
                    onValueChange={(value) => setSelectedLocationId(value ? Number(value) : null)}
                  >
                    <SelectTrigger className={`bg-blue-700 border-blue-600 dark:bg-blue-800 dark:border-blue-700 text-white ${!selectedLocationId ? 'border-red-400' : ''}`}>
                      <SelectValue placeholder="Selecione um local..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.filter(location => {
                        // Se não há inventário selecionado ou o inventário não tem locais selecionados, mostrar todos
                        if (!selectedInventoryDetails || !selectedInventoryDetails.selectedLocationIds || selectedInventoryDetails.selectedLocationIds.length === 0) {
                          return true;
                        }
                        // Filtrar apenas os locais selecionados na criação do inventário
                        return selectedInventoryDetails.selectedLocationIds.includes(location.id);
                      }).map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
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
      </div>

      {/* Interface Dual */}
      <div className="space-y-4 mb-6">
        {/* Tabs para alternar entre métodos */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeTab === 'serial' ? 'default' : 'outline'}
            onClick={() => setActiveTab('serial')}
            className={`flex items-center gap-2 ${
              activeTab === 'serial' 
                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white' 
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            }`}
          >
            <Barcode className="h-4 w-4" />
            Leitura de Série
          </Button>
          <Button
            variant={activeTab === 'sku' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sku')}
            className={`flex items-center gap-2 ${
              activeTab === 'sku' 
                ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white' 
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            }`}
          >
            <Search className="h-4 w-4" />
            Busca por SKU
          </Button>
        </div>

        {/* Campo de leitura de série */}
        {activeTab === 'serial' && (
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSerialScan()}
                  className="flex-1 text-lg"
                  autoFocus={activeTab === 'serial'}
                />
                <Button 
                  onClick={handleSerialScan}
                  disabled={!serialInput.trim() || isLoading || !selectedLocationId}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ler'}
                </Button>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                Escaneie o código de barras do produto para identificação automática
                {!selectedLocationId && (
                  <span className="block text-red-500 dark:text-red-400 text-xs mt-1">
                    ⚠️ Selecione um local de estoque para habilitar a leitura
                  </span>
                )}
              </p>

              {/* Histórico de últimas leituras */}
              {recentScans.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Últimas leituras:</p>
                  <div className="flex flex-wrap gap-1">
                    {recentScans.slice(0, 3).map((scan, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
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
        {activeTab === 'sku' && (
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
                    // Auto-adicionar se quantidade já estiver definida
                    if (product && quantityInput > 0) {
                      handleAddSelectedProduct();
                    }
                  }}
                  placeholder="Buscar por SKU/Descrição..."
                  className="w-full"
                />

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Quantidade"
                    value={quantityInput || ''}
                    onChange={(e) => setQuantityInput(Number(e.target.value))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && selectedProduct && quantityInput > 0) {
                        handleAddSelectedProduct();
                      }
                    }}
                    className="w-24"
                  />
                  <Button 
                    onClick={handleAddSelectedProduct}
                    disabled={!selectedProduct || !quantityInput || isLoading || !selectedLocationId}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex-1"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="font-medium text-green-800 dark:text-green-400">{selectedProduct.name}</div>
                    <div className="text-sm text-green-600 dark:text-green-500">
                      {selectedProduct.categoryName} • SKU: {selectedProduct.sku}
                    </div>
                    {selectedProduct.hasSerialControl && (
                      <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded mt-1 inline-block">
                        ⚠️ Produto com controle de série - Use a leitura de código
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
      </div>

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
                onClick={() => setCountedProducts([])}
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
            <div className="space-y-4">
              {countedProducts.map((product, index) => (
                <div key={`${product.productId}-${index}`} className="border rounded-lg p-4 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {product.productName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {product.productSku}
                      </p>

                      {/* Informações de contagem */}
                      <div className="mt-2 space-y-1">
                        {product.hasSerialControl ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                                <Barcode className="h-3 w-3 mr-1" />
                                Séries: {product.totalSerialCount}
                              </Badge>
                            </div>

                            {/* Lista de séries lidas */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.serialNumbers?.slice(0, 5).map((serial, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {serial}
                                </Badge>
                              ))}
                              {(product.serialNumbers?.length || 0) > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(product.serialNumbers?.length || 0) - 5} mais
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 dark:border-green-800">
                                <Package className="h-3 w-3 mr-1" />
                                Quantidade: {product.manualQuantity}
                              </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCountedProducts(prev => 
                          prev.filter((_, i) => i !== index)
                        )}
                        className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}