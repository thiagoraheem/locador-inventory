import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/header";
import { FileText, Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Package, DollarSign } from "lucide-react";
import type { Inventory, InventoryFinalReport } from "@shared/schema";

export default function InventoryFinalReportPage() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: report, isLoading } = useQuery<InventoryFinalReport>({
    queryKey: [`/api/inventories/${selectedInventoryId}/final-report`],
    enabled: !!selectedInventoryId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'closed': { variant: 'default', label: 'Finalizado' },
      'audit_mode': { variant: 'secondary', label: 'Auditoria' },
      'count3_closed': { variant: 'outline', label: '3ª Contagem' },
      'count2_closed': { variant: 'outline', label: '2ª Contagem' },
      'count1_closed': { variant: 'outline', label: '1ª Contagem' },
    } as const;

    const config = statusMap[status as keyof typeof statusMap] || { variant: 'outline', label: status };
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatório Final de Inventário</h1>
            <p className="text-muted-foreground">
              Relatório completo com análise de acurácia e impacto financeiro
            </p>
          </div>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Inventory Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Inventário</CardTitle>
            <CardDescription>
              Escolha um inventário para gerar o relatório final detalhado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => setSelectedInventoryId(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um inventário..." />
              </SelectTrigger>
              <SelectContent>
                {inventories?.map((inventory) => (
                  <SelectItem key={inventory.id} value={inventory.id.toString()}>
                    Inventário #{inventory.id} - {formatDate(inventory.startDate)} - {getStatusBadge(inventory.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Report Content */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Gerando relatório final...</p>
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            {/* Report Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {report.inventoryName}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(report.startDate)} {report.endDate && `- ${formatDate(report.endDate)}`}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(report.status)}
                    <p className="text-sm text-muted-foreground">ID: {report.inventoryId}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Itens</p>
                      <p className="text-2xl font-bold">{report.totalItems}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Taxa de Acurácia</p>
                      <p className="text-2xl font-bold text-green-600">{report.accuracy.accuracyRate}%</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Itens Divergentes</p>
                      <p className="text-2xl font-bold text-red-600">{report.accuracy.divergentItems}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Impacto Financeiro</p>
                      <p className="text-lg font-bold text-orange-600">{report.financial.impactPercentage}%</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Math.abs(report.financial.differenceValue))}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Accuracy Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Acurácia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Itens Corretos</span>
                      <span className="font-medium">{report.accuracy.accurateItems}</span>
                    </div>
                    <Progress value={(report.accuracy.accurateItems / report.accuracy.totalItems) * 100} className="h-2" />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total de Itens:</span>
                      <span className="font-medium">{report.accuracy.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Itens Acurados:</span>
                      <span className="font-medium text-green-600">{report.accuracy.accurateItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Itens Divergentes:</span>
                      <span className="font-medium text-red-600">{report.accuracy.divergentItems}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Impact */}
              <Card>
                <CardHeader>
                  <CardTitle>Impacto Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Valor Total do Estoque:</span>
                      <span className="font-medium">{formatCurrency(report.financial.totalValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ajustes Positivos:</span>
                      <span className="font-medium text-green-600">
                        <TrendingUp className="inline h-4 w-4 mr-1" />
                        {formatCurrency(report.differences.positiveAdjustments)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ajustes Negativos:</span>
                      <span className="font-medium text-red-600">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        {formatCurrency(report.differences.negativeAdjustments)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Diferença Líquida:</span>
                      <span className={report.financial.differenceValue >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(report.financial.differenceValue)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Counting Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo das Contagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.countingSummary.count1Items}</p>
                    <p className="text-sm text-muted-foreground">1ª Contagem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{report.countingSummary.count2Items}</p>
                    <p className="text-sm text-muted-foreground">2ª Contagem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{report.countingSummary.count3Items}</p>
                    <p className="text-sm text-muted-foreground">3ª Contagem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{report.countingSummary.auditItems}</p>
                    <p className="text-sm text-muted-foreground">Auditoria (C4)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Divergent Items */}
            {report.divergentItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Itens com Divergências</CardTitle>
                  <CardDescription>
                    Lista detalhada dos {report.divergentItems.length} itens que apresentaram diferenças
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead className="text-right">Esperado</TableHead>
                          <TableHead className="text-right">Final</TableHead>
                          <TableHead className="text-right">Diferença</TableHead>
                          <TableHead className="text-right">Impacto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.divergentItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.productSku}</TableCell>
                            <TableCell>{item.locationName}</TableCell>
                            <TableCell className="text-right">{item.expectedQuantity}</TableCell>
                            <TableCell className="text-right font-medium">{item.finalQuantity}</TableCell>
                            <TableCell className={`text-right font-bold ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.difference >= 0 ? '+' : ''}{item.difference}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.totalImpact ? formatCurrency(Math.abs(item.totalImpact)) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end gap-4">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}