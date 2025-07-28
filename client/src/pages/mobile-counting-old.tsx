import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  RefreshCcw,
  Package,
  Barcode,
  CheckCircle,
  AlertCircle,
  Save,
  Trash2,
  Loader2,
  Edit,
  Eye,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { 
  Inventory, 
  InventoryItem, 
  Product, 
  Location, 
  ProductWithSerialControl,
  SerialReadingRequest,
  SerialReadingResponse 
} from "@shared/schema";
import ProductSearchAutocomplete from "@/components/product-search-autocomplete";

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

// Interface para o estado da interface dual
interface MobileCountingState {
  // Entrada de dados
  serialInput: string;
  skuInput: string;
  quantityInput: number;
  
  // Produtos contados
  countedProducts: CountedProduct[];
  
  // UI State
  activeTab: 'serial' | 'sku';
  isLoading: boolean;
  recentScans: string[];
}

export default function MobileCounting() {
  // Estado principal para interface dual
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'serial' | 'sku'>('serial');
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Fetch products with serial control information
  const { data: products } = useQuery<ProductWithSerialControl[]>({
    queryKey: ["/api/products/with-serial-control"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Get active inventories that can be counted
  const activeInventories = inventories?.filter(inv => 
    ['open', 'count1_open', 'count2_open', 'count3_open'].includes(inv.status)
  ) || [];

  // Get current counting stage based on inventory status
  const getCurrentCountStage = () => {
    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv) return 1;
    
    switch (selectedInv.status) {
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
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventories/${selectedInventoryId}/serial-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serialNumber: serialInput.trim(),
          countStage: getCurrentCountStage()
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Adicionar à lista de produtos contados
        addSerialToProduct(result.productId, result.productName, result.productSku, serialInput.trim());
        
        // Atualizar histórico
        setRecentScans(prev => [serialInput.trim(), ...prev.slice(0, 4)]);
        
        toast({
          title: "Série registrada",
          description: `${result.productName} - ${serialInput}`,
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

  // Função para busca por SKU e quantidade manual
  const handleSkuSearch = async () => {
    if (!skuInput.trim() || !quantityInput || !selectedInventoryId) return;
    
    setIsLoading(true);
    try {
      // Buscar produto por SKU ou descrição
      const product = products?.find((p: ProductWithSerialControl) => 
        p.sku.toLowerCase() === skuInput.toLowerCase() ||
        p.name.toLowerCase().includes(skuInput.toLowerCase())
      );
      
      if (!product) {
        toast({
          title: "Produto não encontrado",
          description: "SKU ou descrição não encontrados",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se produto tem controle de série
      if (product.hasSerialControl) {
        toast({
          title: "Produto com controle de série",
          description: "Use a leitura de código de barras para este produto",
          variant: "destructive",
        });
        return;
      }
      
      // Registrar contagem manual
      await registerManualCount(product.id, quantityInput);
      
      addManualProduct(product, quantityInput);
      
      toast({
        title: "Produto adicionado",
        description: `${product.name} - Qtd: ${quantityInput}`,
      });
      
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Falha ao buscar produto",
        variant: "destructive",
      });
    } finally {
      setSkuInput("");
      setQuantityInput(1);
      setIsLoading(false);
    }
  };

  // Função para adicionar produto por série à lista
  const addSerialToProduct = (productId: number, productName: string, productSku: string, serialNumber: string) => {
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
          locationId: 0, // Determinar pela série
          locationName: '',
          hasSerialControl: true,
          serialNumbers: [serialNumber],
          totalSerialCount: 1
        }];
      }
    });
  };

  // Função para adicionar produto manual à lista
  const addManualProduct = (product: ProductWithSerialControl, quantity: number) => {
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
          locationId: 0, // Determinar contexto
          locationName: '',
          hasSerialControl: false,
          manualQuantity: quantity
        }];
      }
    });
  };

  // Função para registrar contagem manual (tradicional)
  const registerManualCount = async (productId: number, quantity: number) => {
    // Esta função será implementada quando tivermos as APIs tradicionais
    // Por enquanto, apenas simular o registro
    return Promise.resolve();
  };

  // Save count for an item
  const handleSaveCount = (itemId: number) => {
    const count = countedItems[itemId];
    if (count === undefined || count < 0) {
      toast({
        title: "Quantidade inválida",
        description: "Insira uma quantidade válida (0 ou maior)",
        variant: "destructive",
      });
      return;
    }

    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv) return;

    const stage = getCurrentCountStage(selectedInv.status);
    const countType = `count${stage}`;

    updateCountMutation.mutate({ itemId, count, countType });

    // Remove item from current list after counting
    setCurrentProducts(prev => prev.filter(item => item.id !== itemId));
    setCountedItems(prev => {
      const newCounts = { ...prev };
      delete newCounts[itemId];
      return newCounts;
    });
  };

  // Remove item from list
  const handleRemoveItem = (itemId: number) => {
    setCurrentProducts(prev => prev.filter(item => item.id !== itemId));
    setCountedItems(prev => {
      const newCounts = { ...prev };
      delete newCounts[itemId];
      return newCounts;
    });
  };

  // Clear all items
  const handleClearAll = () => {
    setCurrentProducts([]);
    setCountedItems({});
  };

  // Reload data
  const handleReload = () => {
    refetchInventories();
    refetchItems();
    setCurrentProducts([]);
    setCountedItems({});
    toast({
      title: "Dados atualizados",
      description: "Informações recarregadas com sucesso",
    });
  };

  const selectedInventory = inventories?.find(inv => inv.id === selectedInventoryId);
  const currentStage = selectedInventory ? getCurrentCountStage(selectedInventory.status) : 1;

  // Auto-select first available inventory if none selected
  useEffect(() => {
    if (!selectedInventoryId && activeInventories.length > 0) {
      setSelectedInventoryId(activeInventories[0].id);
    }
  }, [activeInventories, selectedInventoryId]);

  return (
    <div className="min-h-screen bg-blue-600 p-4">
      {/* Header */}
      <div className="bg-blue-600 text-white mb-6">
        <h1 className="text-2xl font-bold text-center mb-4">Sistema de Inventário</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-500 border-blue-400">
            <CardContent className="p-4">
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Código do Inventário:</label>
                <div className="bg-blue-700 rounded px-3 py-2 font-mono">
                  {selectedInventory?.code || "Selecione um inventário"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500 border-blue-400">
            <CardContent className="p-4">
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Contagem:</label>
                <Select 
                  value={selectedInventoryId?.toString() || ""} 
                  onValueChange={(value) => setSelectedInventoryId(Number(value))}
                >
                  <SelectTrigger className="bg-blue-700 border-blue-600 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeInventories.map((inventory) => (
                      <SelectItem key={inventory.id} value={inventory.id.toString()}>
                        {getStageLabel(getCurrentCountStage(inventory.status))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500 border-blue-400">
            <CardContent className="p-4">
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Data:</label>
                <div className="bg-blue-700 rounded px-3 py-2">
                  {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {!selectedInventoryId || activeInventories.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhuma contagem ativa encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            Não há inventários em andamento para contagem no momento.
          </p>
          <Button onClick={handleReload} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barcode Scanner Section */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Barcode className="h-5 w-5" />
                Leitura de CP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Escaneie ou digite o código..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  onClick={handleBarcodeSubmit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Pressione Enter após escanear ou clique em Adicionar
              </p>
            </CardContent>
          </Card>

          {/* Product Search Section */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Search className="h-5 w-5" />
                Buscar Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSearchAutocomplete onProductSelect={handleProductSelect} />
              <p className="text-sm text-gray-500 mt-2">
                Busque por código SKU ou descrição do produto e informe a quantidade
              </p>
            </CardContent>
          </Card>

          {/* Product List Section */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Package className="h-5 w-5" />
                Lista de Produtos para Inventário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum produto adicionado para contagem</p>
                  <p className="text-sm">Use o leitor de código ou busca de produto acima</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Produto</span>
                    <span className="font-medium">Quantidade</span>
                  </div>

                  {currentProducts.map((item) => {
                    const product = products?.find(p => p.id === item.productId);
                    const location = locations?.find(l => l.id === item.locationId);

                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {product?.name || 'N/A'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {product?.sku} • {location?.name}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {product?.sku && (
                                <Badge variant="outline" className="text-xs">
                                  SKU: {product.sku}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={countedItems[item.id] || ""}
                              onChange={(e) => setCountedItems(prev => ({
                                ...prev,
                                [item.id]: Number(e.target.value)
                              }))}
                              className="w-20 text-center"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveCount(item.id)}
                              disabled={updateCountMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <Button 
              onClick={() => {}} 
              className="bg-blue-600 hover:bg-blue-700 text-white h-14"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Produto
            </Button>

            <Button 
              onClick={() => {}} 
              className="bg-green-600 hover:bg-green-700 text-white h-14"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Salvar Inventário
            </Button>

            <Button 
              onClick={handleClearAll}
              variant="destructive"
              className="h-14"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Limpar Tudo
            </Button>
          </div>

          {/* Reload Button */}
          <div className="text-center">
            <Button 
              onClick={handleReload}
              variant="outline"
              className="w-full bg-white"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}