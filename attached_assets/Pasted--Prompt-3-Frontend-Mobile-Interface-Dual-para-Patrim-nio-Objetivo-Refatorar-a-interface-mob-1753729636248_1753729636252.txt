
# Prompt 3: Frontend Mobile - Interface Dual para Patrimônio

## Objetivo
Refatorar a interface mobile de contagem para suportar entrada dual: leitura de código de barras por número de série e busca por SKU com quantidade manual.

## Refatoração da Página Mobile (mobile-counting.tsx)

### 1. Estado e Estrutura de Dados

```typescript
interface CountedProduct {
  productId: number;
  productName: string;
  productSku: string;
  locationId: number;
  locationName: string;
  hasSerialControl: boolean;
  
  // Para produtos sem série
  manualQuantity?: number;
  
  // Para produtos com série
  serialNumbers?: string[];
  totalSerialCount?: number;
}

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
```

### 2. Interface Dual

```tsx
// Seção de entrada dual
<div className="space-y-4">
  {/* Tabs para alternar entre métodos */}
  <div className="grid grid-cols-2 gap-2">
    <Button
      variant={activeTab === 'serial' ? 'default' : 'outline'}
      onClick={() => setActiveTab('serial')}
      className="flex items-center gap-2"
    >
      <Barcode className="h-4 w-4" />
      Leitura de Série
    </Button>
    <Button
      variant={activeTab === 'sku' ? 'default' : 'outline'}
      onClick={() => setActiveTab('sku')}
      className="flex items-center gap-2"
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
        <div className="flex gap-2">
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
        <p className="text-sm text-blue-600 mt-2">
          Escaneie o código de barras do produto para identificação automática
        </p>
        
        {/* Histórico de últimas leituras */}
        {recentScans.length > 0 && (
          <div className="mt-3">
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
```

### 3. Lógica de Processamento

```typescript
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
      addSerialToProduct(result.productId, result.productName, serialInput.trim());
      
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

const handleSkuSearch = async () => {
  if (!skuInput.trim() || !quantityInput || !selectedInventoryId) return;
  
  setIsLoading(true);
  try {
    // Buscar produto por SKU ou descrição
    const searchResponse = await fetch(`/api/products?search=${encodeURIComponent(skuInput)}`, {
      credentials: 'include',
    });
    
    if (!searchResponse.ok) throw new Error('Falha na busca');
    
    const products = await searchResponse.json();
    const product = products.find((p: Product) => 
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

const addSerialToProduct = (productId: number, productName: string, serialNumber: string) => {
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
        productSku: '', // Buscar depois se necessário
        locationId: 0, // Determinar pela série
        locationName: '',
        hasSerialControl: true,
        serialNumbers: [serialNumber],
        totalSerialCount: 1
      }];
    }
  });
};

const addManualProduct = (product: Product, quantity: number) => {
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
```

### 4. Lista de Produtos Agrupada

```tsx
<Card className="bg-white">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-blue-800">
      <Package className="h-5 w-5" />
      Produtos Contados ({countedProducts.length})
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
                  onClick={() => removeProduct(index)}
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
```

### 5. Ações de Salvar e Finalizar

```typescript
const handleSaveSession = async () => {
  setIsLoading(true);
  try {
    // Salvar produtos com série
    for (const product of countedProducts.filter(p => p.hasSerialControl)) {
      // Séries já foram registradas individualmente na leitura
      console.log(`${product.totalSerialCount} séries registradas para ${product.productName}`);
    }
    
    // Salvar produtos manuais
    for (const product of countedProducts.filter(p => !p.hasSerialControl)) {
      await fetch(`/api/inventory-items/${product.productId}/count${getCurrentCountStage()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count: product.manualQuantity }),
      });
    }
    
    // Executar reconciliação
    await fetch(`/api/inventories/${selectedInventoryId}/reconcile`, {
      method: 'POST',
      credentials: 'include',
    });
    
    toast({
      title: "Sessão salva",
      description: "Todos os itens foram registrados com sucesso",
    });
    
    // Limpar lista
    setCountedProducts([]);
    
  } catch (error) {
    toast({
      title: "Erro ao salvar",
      description: "Falha ao registrar alguns itens",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

## Melhorias na UX

### 1. Feedback Visual
- Cores diferenciadas para cada tipo de entrada
- Ícones contextuais (código de barras vs. busca)
- Badges para identificar tipos de produto
- Animações de sucesso/erro

### 2. Histórico e Estado
- Últimas séries lidas
- Cache de buscas recentes
- Estado persistente da sessão
- Recuperação em caso de erro

### 3. Validações e Alertas
- Verificação de duplicatas
- Alertas para produtos com controle incorreto
- Confirmações antes de ações destrutivas
- Indicadores de progresso

## Tarefas de Implementação

1. **Refatorar mobile-counting.tsx**: Implementar interface dual
2. **Criar Hooks Customizados**: Para lógica de contagem
3. **Componentes Reutilizáveis**: Cards de produto, badges
4. **Testes de Usabilidade**: Validar fluxo mobile
5. **Performance**: Otimizar renderização de listas

## Próximo Prompt
Após implementação mobile: **Interface Desktop - Reconciliação e Relatórios**
