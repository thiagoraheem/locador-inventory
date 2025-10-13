import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Product } from '../../../shared/schema';

interface ProductSelectorProps {
  selectedCategoryIds: number[];
  selectedProductIds: number[];
  onProductSelectionChange: (productIds: number[]) => void;
  disabled?: boolean;
}

interface ProductsByCategoryResponse {
  products: Product[];
}

const fetchProductsByCategories = async (categoryIds: number[]): Promise<Product[]> => {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }
  
  const response = await fetch(
    `/api/products/by-categories?categoryIds=${categoryIds.join(',')}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return response.json();
};

export function ProductSelector({
  selectedCategoryIds,
  selectedProductIds,
  onProductSelectionChange,
  disabled = false,
}: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Memoize the selectedCategoryIds to prevent unnecessary re-renders
  const memoizedCategoryIds = useMemo(() => selectedCategoryIds, [selectedCategoryIds.join(',')]);

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products-by-categories', memoizedCategoryIds],
    queryFn: () => fetchProductsByCategories(memoizedCategoryIds),
    enabled: memoizedCategoryIds.length > 0,
  });

  useEffect(() => {
    if (!products) {
      setFilteredProducts([]);
      return;
    }

    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const handleProductToggle = (productId: number) => {
    if (disabled) return;
    
    const newSelectedProducts = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    
    onProductSelectionChange(newSelectedProducts);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onProductSelectionChange(filteredProducts.map(p => p.id));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onProductSelectionChange([]);
  };

  if (selectedCategoryIds.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
        Selecione pelo menos uma categoria para visualizar os produtos disponíveis.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando produtos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4 text-center border border-red-200 rounded-md bg-red-50">
        Erro ao carregar produtos. Tente novamente.
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
        Nenhum produto encontrado nas categorias selecionadas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={disabled || filteredProducts.length === 0}
        >
          Selecionar Todos
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDeselectAll}
          disabled={disabled || selectedProductIds.length === 0}
        >
          Desmarcar Todos
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {selectedProductIds.length} de {filteredProducts.length} produtos selecionados
      </div>

      <ScrollArea className="h-64 border rounded-md p-4">
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="flex items-start space-x-3">
              <Checkbox
                id={`product-${product.id}`}
                checked={selectedProductIds.includes(product.id)}
                onCheckedChange={() => handleProductToggle(product.id)}
                disabled={disabled}
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`product-${product.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {product.name}
                </label>
                <div className="text-xs text-muted-foreground mt-1">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  {product.category && (
                    <span className="ml-2">Categoria: {product.category.name}</span>
                  )}
                </div>
                {product.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {product.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}