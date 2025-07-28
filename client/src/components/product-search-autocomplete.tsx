
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import type { Product } from "@shared/schema";

interface ProductSearchAutocompleteProps {
  onProductSelect: (product: Product, quantity: number) => void;
  placeholder?: string;
  quantityInput?: number;
  onQuantityChange?: (quantity: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function ProductSearchAutocomplete({
  onProductSelect,
  placeholder = "Buscar Produto",
  quantityInput = 1,
  onQuantityChange,
  disabled = false,
  className = ""
}: ProductSearchAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [quantity, setQuantity] = useState(quantityInput);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Buscar produtos quando há termo de busca
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const params = new URLSearchParams();
      params.set('search', searchTerm);
      params.set('includeInactive', 'false');
      
      const response = await fetch(`/api/products?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: searchTerm.length >= 1,
    retry: false,
  });

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = products?.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 10) || [];

  // Atualizar quantidade externa quando interna mudar
  useEffect(() => {
    onQuantityChange?.(quantity);
  }, [quantity, onQuantityChange]);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Selecionar produto
  const handleProductSelect = (product: Product) => {
    onProductSelect(product, quantity);
    setSearchTerm("");
    setShowResults(false);
    setSelectedIndex(-1);
  };

  // Controlar visibilidade dos resultados
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar resultados quando há produtos ou termo de busca
  useEffect(() => {
    setShowResults(searchTerm.length >= 1 && (filteredProducts.length > 0 || isLoading));
  }, [searchTerm, filteredProducts.length, isLoading]);

  return (
    <div className={`relative ${className}`}>
      {/* Campo de busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchTerm.length >= 1) {
                setShowResults(true);
              }
            }}
            disabled={disabled}
            className="pl-10 pr-4"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        
        {/* Campo de quantidade */}
        <Input
          type="number"
          min="1"
          placeholder="Qtd"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          disabled={disabled}
          className="w-20"
        />
        
        {/* Botão adicionar */}
        <Button 
          onClick={() => {
            if (filteredProducts.length === 1) {
              handleProductSelect(filteredProducts[0]);
            }
          }}
          disabled={disabled || filteredProducts.length !== 1 || !searchTerm.trim()}
          className="bg-green-600 hover:bg-green-700"
        >
          Adicionar
        </Button>
      </div>

      {/* Resultados da busca */}
      {showResults && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto shadow-lg border"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Buscando produtos...
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="divide-y">
                {filteredProducts.map((product: Product, index: number) => (
                  <div
                    key={product.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="font-medium text-gray-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">SKU:</span> {product.sku}
                      {product.categoryId && (
                        <>
                          {" • "}
                          <span>Categoria: {product.categoryId}</span>
                        </>
                      )}
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        {product.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchTerm.trim() && (
              <div className="p-4 text-center text-gray-500">
                Nenhum produto encontrado para "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
