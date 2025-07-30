import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { Download, FileText, Printer, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryItem, Product, Category } from "@shared/schema";

export default function ProductListingReport() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventories/${selectedInventoryId}/items`],
    enabled: !!selectedInventoryId,
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
    const printContent = printRef.current;
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printContents = printContent.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleExportPDF = () => {
    // Implement PDF export functionality
    toast({
      title: "Exportar PDF",
      description: "Funcionalidade de exportação em desenvolvimento",
    });
  };

  const totalProducts = inventoryProducts.length;

  return (
    <div>
      <Header 
        title="Listagem de Produtos" 
        subtitle="Relatório de produtos por inventário agrupados por categoria" 
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Inventory Selection */}
        <Card>
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedInventoryId && selectedInventory ? (
          <div ref={printRef}>
            {/* Report Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Relatório de Produtos</CardTitle>
                    <CardDescription className="mt-2">
                      Inventário: {selectedInventory.code} - {selectedInventory.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {totalProducts} produtos
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Products by Category */}
            {Object.keys(groupedProducts).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
                  <Card key={categoryName}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5" />
                        <CardTitle className="text-lg">{categoryName.toUpperCase()}</CardTitle>
                        <Badge variant="secondary">
                          {categoryProducts.length} produtos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">SKU</TableHead>
                              <TableHead>Descrição</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-mono text-sm">
                                  {product.sku}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    {product.description && (
                                      <div className="text-sm text-muted-foreground">
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
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground">
                    Nenhum produto encontrado para este inventário.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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