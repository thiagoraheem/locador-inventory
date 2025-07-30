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

interface GroupedProduct {
  categoryId?: number;
  categoryName: string;
  products: {
    sku: string;
    name: string;
    description?: string;
  }[];
}

export default function ProductListingReport() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: selectedInventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${selectedInventoryId}`],
    enabled: !!selectedInventoryId,
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

  const getGroupedProducts = (): GroupedProduct[] => {
    if (!inventoryItems || !products || !categories) return [];

    // Obter produtos únicos do inventário
    const uniqueProductIds = Array.from(new Set(inventoryItems.map(item => item.productId)));
    const inventoryProducts = products.filter(product => uniqueProductIds.includes(product.id));

    // Agrupar por categoria
    const grouped = new Map<number | undefined, GroupedProduct>();

    inventoryProducts.forEach(product => {
      const categoryId = product.categoryId;
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category?.name || 'Sem Categoria';

      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          categoryId,
          categoryName,
          products: []
        });
      }

      grouped.get(categoryId)!.products.push({
        sku: product.sku,
        name: product.name,
        description: product.description
      });
    });

    // Converter para array e ordenar
    const result = Array.from(grouped.values());
    
    // Ordenar categorias por nome
    result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    
    // Ordenar produtos dentro de cada categoria por nome
    result.forEach(group => {
      group.products.sort((a, b) => a.name.localeCompare(b.name));
    });

    return result;
  };

  const groupedProducts = getGroupedProducts();
  const totalProducts = groupedProducts.reduce((total, group) => total + group.products.length, 0);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Listagem de Produtos - ${selectedInventory?.code}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px;
                  color: #333;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #ccc;
                  padding-bottom: 20px;
                }
                .info-section {
                  margin-bottom: 20px;
                  display: flex;
                  justify-content: space-between;
                }
                .category-group {
                  margin-bottom: 25px;
                  page-break-inside: avoid;
                }
                .category-header {
                  background-color: #f5f5f5;
                  padding: 10px;
                  font-weight: bold;
                  font-size: 16px;
                  border-left: 4px solid #007bff;
                  margin-bottom: 10px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f8f9fa;
                  font-weight: bold;
                }
                tr:nth-child(even) {
                  background-color: #f9f9f9;
                }
                .summary {
                  margin-top: 30px;
                  padding: 15px;
                  background-color: #e9ecef;
                  border-radius: 5px;
                }
                @page {
                  margin: 2cm;
                }
                @media print {
                  .category-group {
                    page-break-inside: avoid;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportPDF = () => {
    // Implementar exportação para PDF usando uma biblioteca como jsPDF
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exportação para PDF será implementada em breve.",
    });
  };

  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR');

  return (
    <div>
      <Header 
        title="Listagem de Produtos" 
        subtitle="Relatório de produtos por inventário agrupados por categoria" 
      />
      
      <div className="space-y-6">
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
                <Select value={selectedInventoryId?.toString() || ""} onValueChange={(value) => setSelectedInventoryId(parseInt(value))}>
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
                  <Button 
                    variant="outline" 
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedInventoryId && selectedInventory ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Relatório de Produtos</CardTitle>
                  <CardDescription>
                    Inventário: {selectedInventory.code} - {selectedInventory.description || 'Sem descrição'}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {totalProducts} produtos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={printRef}>
                {/* Print Header */}
                <div className="header" style={{ display: 'none' }}>
                  <h1>Listagem de Produtos por Inventário</h1>
                  <h2>Inventário: {selectedInventory.code}</h2>
                  <p>{selectedInventory.description}</p>
                </div>

                {/* Print Info Section */}
                <div className="info-section" style={{ display: 'none' }}>
                  <div>
                    <strong>Data de Emissão:</strong> {currentDate}<br/>
                    <strong>Hora de Emissão:</strong> {currentTime}
                  </div>
                  <div>
                    <strong>Total de Produtos:</strong> {totalProducts}<br/>
                    <strong>Total de Categorias:</strong> {groupedProducts.length}
                  </div>
                </div>

                {groupedProducts.length > 0 ? (
                  <div className="space-y-6">
                    {groupedProducts.map((group, index) => (
                      <div key={index} className="category-group">
                        <div className="category-header">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {group.categoryName}
                            <Badge variant="secondary" className="ml-2">
                              {group.products.length} produtos
                            </Badge>
                          </h3>
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-32">SKU</TableHead>
                                <TableHead>Descrição</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.products.map((product, productIndex) => (
                                <TableRow key={productIndex}>
                                  <TableCell className="font-mono">
                                    <Badge variant="outline">{product.sku}</Badge>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4" />
                    <p>Nenhum produto encontrado para este inventário.</p>
                  </div>
                )}

                {/* Print Summary */}
                <div className="summary" style={{ display: 'none' }}>
                  <h4>Resumo do Relatório</h4>
                  <p><strong>Total de Categorias:</strong> {groupedProducts.length}</p>
                  <p><strong>Total de Produtos:</strong> {totalProducts}</p>
                  <p><strong>Status do Inventário:</strong> {selectedInventory.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* Hidden print styles */}
      <style>{`
        @media print {
          .header, .info-section, .summary {
            display: block !important;
          }
          
          .category-group {
            page-break-inside: avoid;
          }
          
          table {
            font-size: 12px;
          }
          
          th, td {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}