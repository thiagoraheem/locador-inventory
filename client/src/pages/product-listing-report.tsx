import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Package, ArrowLeft } from "lucide-react";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryItem, Product, Category } from "@shared/schema";
import Header from "@/components/layout/header";
import DataTable from "@/components/data-table";

export default function ProductListingReport() {
  const { selectedInventoryId, setSelectedInventoryId } = useSelectedInventory();
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: inventoryItems, isLoading: isLoadingItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled: !!selectedInventoryId,
    staleTime: 0, // Force fresh data fetch
    gcTime: 0, // Don't cache to ensure fresh data (v5 syntax)
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const selectedInventory = inventories?.find(inv => inv.id === selectedInventoryId);

  // Filter products that are actually in the selected inventory
  const inventoryProducts = inventoryItems?.map(item => {
    const product = products?.find(p => p.id === item.productId);
    return product ? { ...product, inventoryItem: item } : null;
  }).filter(Boolean) || [];

  // Group products by category
  const groupedProducts = inventoryProducts.reduce((acc, product) => {
    if (!product) return acc;

    const category = categories?.find(c => c.id === product.categoryId);
    const categoryName = category?.name || "Sem categoria";

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  const handlePrint = () => {
    // Use CSS media queries for print instead of replacing HTML
    window.print();
  };



  const totalProducts = inventoryProducts.length;

  return (
    <div>
      <Header 
        title="Listagem de Produtos" 
        subtitle="Relatório de produtos por inventário agrupados por categoria" 
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Inventory Selection - Hidden when printing */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Selecionar Inventário</CardTitle>
            <CardDescription>
              Escolha um inventário para gerar a listagem de produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select 
                  value={selectedInventoryId?.toString() || ""} 
                  onValueChange={(value) => setSelectedInventoryId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um inventário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventories?.map((inventory) => (
                      <SelectItem key={inventory.id} value={inventory.id.toString()}>
                        {inventory.code} - {inventory.description || 'Sem descrição'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInventoryId && (
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedInventoryId && selectedInventory && !isLoadingItems ? (
          <div ref={printRef} data-print-content className="print:space-y-3">
            {/* Report Header - Condensed */}
            <Card className="mb-4 print:mb-3 print:shadow-none">
              <CardHeader className="pb-3 print:pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg print:text-base">Relatório de Produtos</CardTitle>
                    <CardDescription className="text-sm print:text-xs mt-1">
                      Inventário: {selectedInventory.code} - {selectedInventory.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm print:text-xs px-2 py-1">
                    {totalProducts} produtos
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Products by Category - Condensed */}
            {isLoadingItems ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div className="text-base font-medium">Carregando produtos do inventário...</div>
                    <div className="text-sm text-muted-foreground">
                      Aguarde enquanto buscamos os dados...
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : Object.keys(groupedProducts).length > 0 ? (
              <div className="space-y-3 print:space-y-1">
                {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
                  <Card key={categoryName} className="print:shadow-none print:border print:break-inside-avoid">
                    <CardHeader className="pb-2 print:pb-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 print:hidden" />
                        <CardTitle className="text-base print:text-sm font-semibold">
                          {categoryName.toUpperCase()}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {categoryProducts.length} produtos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 print:pt-0">
                      <div className="border rounded print:rounded-none">
                        <Table>
                          <TableHeader>
                            <TableRow className="print:border-b">
                              <TableHead className="w-[100px] print:w-[80px] text-xs print:text-xs py-2 print:py-1 font-semibold">
                                SKU
                              </TableHead>
                              <TableHead className="text-xs print:text-xs py-2 print:py-1 font-semibold">
                                Descrição
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryProducts.map((product, index) => (
                              <TableRow 
                                key={product.id} 
                                className={`print:border-b ${index % 2 === 0 ? 'print:bg-gray-50' : ''}`}
                              >
                                <TableCell className="font-mono text-xs print:text-xs py-1.5 print:py-0.5 align-top">
                                  {product.sku}
                                </TableCell>
                                <TableCell className="py-1.5 print:py-0.5 align-top">
                                  <div className="text-xs print:text-xs leading-tight">
                                    <div className="font-medium leading-tight">{product.name}</div>
                                    {product.description && product.description !== product.name && (
                                      <div className="text-muted-foreground text-xs print:text-xs leading-tight mt-0.5">
                                        {product.description}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-base font-semibold mb-2">Nenhum produto encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    Nenhum produto encontrado para este inventário.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecione um Inventário</h3>
              <p className="text-muted-foreground">
                Escolha um inventário acima para gerar o relatório de produtos
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}