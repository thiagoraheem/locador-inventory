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
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryItem, Product, Location } from "@shared/schema";
import ProductSearchAutocomplete from "@/components/product-search-autocomplete";

export default function MobileCounting() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [countedItems, setCountedItems] = useState<{ [itemId: number]: number }>({});
  const [currentProducts, setCurrentProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active inventories
  const { data: inventories, refetch: refetchInventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Fetch inventory items for selected inventory
  const { data: inventoryItems, refetch: refetchItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled: !!selectedInventoryId,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Get active inventories that can be counted
  const activeInventories = inventories?.filter(inv => 
    ['open', 'count1_open', 'count2_open', 'count3_open'].includes(inv.status)
  ) || [];

  // Get current counting stage based on inventory status
  const getCurrentCountStage = (status: string) => {
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

  // Update count mutation
  const updateCountMutation = useMutation({
    mutationFn: async ({ itemId, count, countType }: { itemId: number; count: number; countType: string }) => {
      const response = await fetch(`/api/inventory-items/${itemId}/${countType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count }),
      });

      if (!response.ok) {
        throw new Error('Failed to update count');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem registrada",
        description: "Item contado com sucesso",
      });
      refetchItems();
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle barcode scan/input
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;

    const product = products?.find(p => 
      p.sku.toLowerCase() === barcodeInput.toLowerCase() ||
      p.name.toLowerCase().includes(barcodeInput.toLowerCase())
    );

    if (product) {
      const inventoryItem = inventoryItems?.find(item => item.productId === product.id);
      if (inventoryItem) {
        setCurrentProducts(prev => {
          const exists = prev.find(item => item.id === inventoryItem.id);
          if (!exists) {
            return [...prev, inventoryItem];
          }
          return prev;
        });
      } else {
        toast({
          title: "Produto não encontrado no inventário",
          description: "Este produto não está incluído no inventário selecionado",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Produto não encontrado",
        description: "Código ou produto não encontrado no sistema",
        variant: "destructive",
      });
    }

    setBarcodeInput("");
  };

  // Function to register manual count
  const registerManualCount = async (productId: number, quantity: number) => {
    const inventoryItem = inventoryItems?.find(item => item.productId === productId);

    if (!inventoryItem) {
      toast({
        title: "Produto não encontrado no inventário",
        description: "Este produto não está incluído no inventário selecionado",
        variant: "destructive",
      });
      throw new Error("Produto não encontrado no inventário");
    }

    const selectedInv = inventories?.find(inv => inv.id === selectedInventoryId);
    if (!selectedInv) throw new Error("Inventário não selecionado");

    const stage = getCurrentCountStage(selectedInv.status);
    const countType = `count${stage}`;

    await updateCountMutation.mutateAsync({ itemId: inventoryItem.id, count: quantity, countType });
  };

  // Function to add manual product to the current list
  const addManualProduct = (product: Product, quantity: number) => {
    const inventoryItem = inventoryItems?.find(item => item.productId === product.id);

    if (inventoryItem) {
      setCurrentProducts(prev => {
        const exists = prev.find(existingItem => existingItem.id === inventoryItem.id);
        if (!exists) {
          return [...prev, inventoryItem];
        }
        return prev;
      });

      setCountedItems(prev => ({
        ...prev,
        [inventoryItem.id]: (prev[inventoryItem.id] || 0) + quantity
      }));
    } else {
      toast({
        title: "Produto não encontrado no inventário",
        description: "Este produto não está incluído no inventário selecionado",
        variant: "destructive",
      });
    }
  };

  // Handle product search
  const handleProductSelect = async (product: Product, quantity: number) => {
    if (!selectedInventoryId) return;

    setIsLoading(true);
    try {
      // Verificar se produto tem controle de série
      if ((product as any).hasSerialControl) {
        toast({
          title: "Produto com controle de série",
          description: "Use a leitura de código de barras para este produto",
          variant: "destructive",
        });
        return;
      }

      // Registrar contagem manual
      await registerManualCount(product.id, quantity);

      addManualProduct(product, quantity);

      toast({
        title: "Produto adicionado",
        description: `${product.name} - Qtd: ${quantity}`,
      });

    } catch (error) {
      toast({
        title: "Erro ao adicionar produto",
        description: "Falha ao registrar contagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              <ProductSearchAutocomplete onSelect={handleProductSelect} />
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