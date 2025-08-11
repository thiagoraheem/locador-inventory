import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  sku: string;
  name: string;
  categoryName: string;
  hasSerialControl: boolean;
}

interface ProductSearchComboboxProps {
  value?: Product | null;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductSearchCombobox({
  value,
  onSelect,
  placeholder = "Buscar por SKU/Descrição...",
  className,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query to search products
  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["/api/products/search", debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || debouncedTerm.length < 1) return [];

      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(debouncedTerm)}&limit=10`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error(
          "❌ Erro na busca:",
          response.status,
          response.statusText,
        );
        if (response.status === 404) {
          return []; // Return empty array instead of throwing for 404
        }
        const errorText = await response.text();
        throw new Error(
          `Search failed: ${response.status} - ${response.statusText}`,
        );
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    enabled: debouncedTerm.length >= 1,
    retry: 1,
    retryDelay: 500,
  });

  const handleSelect = (product: Product) => {
    onSelect(product);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <div className="flex items-center">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <span className="truncate">
                {value ? `${value.name} • ${value.sku}` : placeholder}
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Digite SKU ou descrição..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading && searchTerm.length >= 2 && (
                <CommandEmpty>Buscando produtos...</CommandEmpty>
              )}

              {error && searchTerm.length >= 2 && (
                <CommandEmpty className="text-red-600">
                  Erro na busca: {error.message}
                </CommandEmpty>
              )}

              {!isLoading &&
                !error &&
                searchTerm.length >= 2 &&
                products.length === 0 && (
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                )}

              {searchTerm.length < 2 && (
                <CommandEmpty>
                  Digite pelo menos 2 caracteres para buscar.
                </CommandEmpty>
              )}

              {products.length > 0 && (
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.sku}-${product.name}`}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.categoryName} • SKU: {product.sku}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {value && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
