import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Package,
  Barcode,
  Loader2,
  ArrowLeft,
  RefreshCcw,
  Trash2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { 
  Inventory, 
  ProductWithSerialControl,
  SerialReadingRequest,
  SerialReadingResponse 
} from "@shared/schema";

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

  // Fetch all active inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Fetch products with serial control information
  const { data: products } = useQuery<ProductWithSerialControl[]>({
    queryKey: ["/api/products/with-serial-control"],
  });

  // Get active inventories that can be counted
  const activeInventories = inventories?.filter(inv => 
    ['open', 'count1_open', 'count2_open', 'count3_open'].includes(inv.status)
  ) || [];

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
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventories/${selectedInventoryId}/serial-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serialNumber: serialInput.trim(),
          countStage: `count${getCurrentCountStage()}`
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
          locationId: 0,
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
          locationId: 0,
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

  // Auto-select first available inventory if none selected
  useEffect(() => {
    if (!selectedInventoryId && activeInventories.length > 0) {
      setSelectedInventoryId(activeInventories[0].id);
    }
  }, [activeInventories, selectedInventoryId]);

  const selectedInventory = inventories?.find(inv => inv.id === selectedInventoryId);
  const currentStage = selectedInventory ? getCurrentCountStage() : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      {/* Header */}
      <div className="text-white mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-blue-700"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Contagem Mobile</h1>
        </div>

        {/* Inventory Selection */}
        <Card className="bg-blue-500/30 border-blue-400 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Inventário:</label>
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
                        {inventory.code} - {getStageLabel(getCurrentCountStage())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-white">
                <label className="block text-sm font-medium mb-2">Estágio:</label>
                <div className="bg-blue-700 rounded px-3 py-2 text-center font-semibold">
                  {getStageLabel(currentStage)}
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
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
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
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            }`}
          >
            <Search className="h-4 w-4" />
            Busca por SKU
          </Button>
        </div>

        {/* Campo de leitura de série */}
        {activeTab === 'serial' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
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
                  disabled={!serialInput.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ler'}
                </Button>
              </div>
              <p className="text-sm text-blue-600 mb-3">
                Escaneie o código de barras do produto para identificação automática
              </p>
              
              {/* Histórico de últimas leituras */}
              {recentScans.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Últimas leituras:</p>
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
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Search className="h-5 w-5" />
                Busca por SKU/Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  placeholder="Digite SKU ou descrição do produto..."
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSkuSearch()}
                  className="flex-1"
                  autoFocus={activeTab === 'sku'}
                />
                
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Quantidade"
                    value={quantityInput || ''}
                    onChange={(e) => setQuantityInput(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button 
                    onClick={handleSkuSearch}
                    disabled={!skuInput.trim() || !quantityInput || isLoading}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-green-600 mt-2">
                Busque por código SKU ou descrição e informe a quantidade
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista de Produtos Contados */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Package className="h-5 w-5" />
              Produtos Contados ({countedProducts.length})
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCountedProducts([])}
                disabled={countedProducts.length === 0}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {countedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto contado</p>
              <p className="text-sm">Use os métodos de entrada acima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {countedProducts.map((product, index) => (
                <div key={`${product.productId}-${index}`} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {product.productName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        SKU: {product.productSku}
                      </p>
                      
                      {/* Informações de contagem */}
                      <div className="mt-2 space-y-1">
                        {product.hasSerialControl ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-blue-50">
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
                            <Badge variant="outline" className="text-xs bg-green-50">
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
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCountedProducts(prev => 
                          prev.filter((_, i) => i !== index)
                        )}
                        className="text-red-600 border-red-300 hover:bg-red-50"
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