import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CategoryFilter from "@/components/category-filter";
import { Search, Package, MapPin } from "lucide-react";

interface StockItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    sku: string;
    name: string;
    categoryId: number;
    category?: {
      id: number;
      name: string;
    };
  };
  location: {
    id: number;
    name: string;
  };
}

interface PivotData {
  categoryName: string;
  categoryId: number;
  products: {
    sku: string;
    name: string;
    locations: {
      locationName: string;
      quantity: number;
    }[];
  }[];
}

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["/api/stock"],
    retry: false,
  });

  // Transform stock data into pivot format
  const pivotData = useMemo(() => {
    if (!stock || !Array.isArray(stock)) return [];
    
    const stockItems = stock as StockItem[];
    const categoryMap = new Map<number, PivotData>();
    
    stockItems.forEach((item) => {
      // Verificações de segurança para evitar erros
      if (!item.product || !item.location) {
        console.warn('Item de estoque com dados incompletos:', item);
        return;
      }
      
      const categoryId = item.product.categoryId;
      const categoryName = item.product.category?.name || `Categoria ${categoryId}`;
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName,
          products: []
        });
      }
      
      const category = categoryMap.get(categoryId)!;
      let product = category.products.find(p => p.sku === item.product.sku);
      
      if (!product) {
        product = {
          sku: item.product.sku || 'N/A',
          name: item.product.name || 'Produto sem nome',
          locations: []
        };
        category.products.push(product);
      }
      
      product.locations.push({
        locationName: item.location.name || 'Local não informado',
        quantity: item.quantity || 0
      });
    });
    
    return Array.from(categoryMap.values());
  }, [stock]);
  
  // Filter pivot data based on search and category
  const filteredPivotData = useMemo(() => {
    let filtered = pivotData;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(category => 
        category.categoryId.toString() === selectedCategory
      );
    }
    
    // Filter by search query (SKU or product name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(category => ({
        ...category,
        products: category.products.filter(product => 
          product.sku.toLowerCase().includes(query) ||
          product.name.toLowerCase().includes(query)
        )
      })).filter(category => category.products.length > 0);
    }
    
    return filtered;
  }, [pivotData, selectedCategory, searchQuery]);

  // Get all unique locations for table headers
  const allLocations = useMemo(() => {
    const locations = new Set<string>();
    pivotData.forEach(category => {
      category.products.forEach(product => {
        product.locations.forEach(location => {
          locations.add(location.locationName);
        });
      });
    });
    return Array.from(locations).sort();
  }, [pivotData]);

  const renderPivotTable = () => {
    if (!filteredPivotData.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum item encontrado</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {filteredPivotData.map((category) => (
          <div key={category.categoryId} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {category.categoryName}
                <Badge variant="secondary" className="ml-2">
                  {category.products.length} produto(s)
                </Badge>
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Produto</th>
                    {allLocations.map((location) => (
                      <th key={location} className="px-4 py-3 text-center font-medium text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {location}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {category.products.map((product, index) => (
                    <tr key={product.sku} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 font-mono text-sm">{product.sku}</td>
                      <td className="px-4 py-3">{product.name}</td>
                      {allLocations.map((location) => {
                        const locationData = product.locations.find(l => l.locationName === location);
                        return (
                          <td key={location} className="px-4 py-3 text-center">
                            {locationData ? (
                              <Badge variant={locationData.quantity > 0 ? "default" : "secondary"}>
                                {locationData.quantity.toLocaleString()}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Header title="Controle de Estoque" subtitle="Visualização pivot de produtos por categoria e local" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                Estoque por Categoria e Local
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  placeholder="Todas as categorias"
                />
                <div className="relative">
                  <Input
                    placeholder="Buscar por SKU ou produto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Summary stats */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="h-4 w-4" />
                <span>{filteredPivotData.length} categoria(s)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{allLocations.length} local(is)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">
                  {filteredPivotData.reduce((acc, cat) => acc + cat.products.length, 0)} produto(s)
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {stockLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando estoque...</p>
              </div>
            ) : (
              renderPivotTable()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
