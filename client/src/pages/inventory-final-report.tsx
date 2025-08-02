import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Printer, 
  Download, 
  FileText, 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Package,
  BarChart3,
  MapPin,
  Tags
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Inventory, InventoryFinalReport } from "@shared/schema";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function InventoryFinalReportPage() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Handle URL parameters to auto-select inventory
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inventoryId = urlParams.get('inventory');
    if (inventoryId && !selectedInventoryId) {
      setSelectedInventoryId(parseInt(inventoryId));
    }
  }, [location, selectedInventoryId]);

  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const { data: report, isLoading: isLoadingReport } = useQuery<InventoryFinalReport>({
    queryKey: [`/api/inventories/${selectedInventoryId}/final-report`],
    enabled: !!selectedInventoryId,
    staleTime: 0,
    gcTime: 0,
  });

  // Filter inventories to show only closed ones
  const closedInventories = inventories?.filter(inv => inv.status === 'closed') || [];

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePDF = async () => {
    if (!reportRef.current || !report) {
      toast({
        title: "Erro",
        description: "Relatório não encontrado para gerar PDF",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Create a clone of the report element for PDF generation
      const element = reportRef.current;
      
      // Temporarily hide non-essential elements for PDF
      const elementsToHide = element.querySelectorAll('.no-pdf');
      elementsToHide.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Generate canvas from HTML
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Restore hidden elements
      elementsToHide.forEach(el => {
        (el as HTMLElement).style.display = '';
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // If content is longer than one page, split it
      if (finalHeight > pdfHeight) {
        let position = 0;
        const pageHeight = imgHeight * (pdfWidth / imgWidth);
        
        while (position < imgHeight) {
          const pageCanvas = document.createElement('canvas');
          const ctx = pageCanvas.getContext('2d');
          
          pageCanvas.width = imgWidth;
          pageCanvas.height = Math.min(pageHeight, imgHeight - position);
          
          ctx?.drawImage(canvas, 0, position, imgWidth, pageCanvas.height, 0, 0, imgWidth, pageCanvas.height);
          
          const pageImgData = pageCanvas.toDataURL('image/png');
          
          if (position > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, (pageCanvas.height * pdfWidth) / imgWidth);
          position += pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', (pdfWidth - finalWidth) / 2, (pdfHeight - finalHeight) / 2, finalWidth, finalHeight);
      }

      // Save PDF
      pdf.save(`relatorio-inventario-${report.inventoryCode}.pdf`);

      toast({
        title: "PDF Gerado",
        description: "O relatório foi gerado com sucesso",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "closed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fechado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <Header 
        title="Relatório de Inventário Fechado" 
        subtitle="Relatório completo com KPIs, participantes e detalhamento de divergências" 
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Inventory Selection */}
        <Card className="print:hidden no-pdf">
          <CardHeader>
            <CardTitle>Selecionar Inventário Fechado</CardTitle>
            <CardDescription>
              Escolha um inventário fechado para gerar o relatório final
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
                    <SelectValue placeholder="Selecione um inventário fechado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {closedInventories.map((inventory) => (
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
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGeneratingPDF ? "Gerando PDF..." : "Gerar PDF"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {selectedInventoryId && report && !isLoadingReport ? (
          <div ref={reportRef} className="print:space-y-4">
            {/* Report Header */}
            <Card className="mb-6 print:mb-4">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl print:text-xl mb-2">
                      Relatório Final de Inventário
                    </CardTitle>
                    <div className="space-y-1">
                      <p className="text-lg print:text-base font-semibold">{report.inventoryCode}</p>
                      <p className="text-muted-foreground">{report.inventoryName}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {getStatusBadge(report.status)}
                        <span className="text-sm text-muted-foreground">
                          Tipo: {report.type.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm print:text-xs">
                    <p className="text-muted-foreground">Criado por: {report.createdBy.name}</p>
                    <p className="text-muted-foreground">
                      Data de início: {formatDate(report.startDate)}
                    </p>
                    {report.endDate && (
                      <p className="text-muted-foreground">
                        Data de término: {formatDate(report.endDate)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Total</p>
                      <p className="text-xl font-bold">{formatCurrency(report.kpis.totalStock)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Acuracidade</p>
                      <p className="text-xl font-bold">{report.kpis.accuracyRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Perdas Totais</p>
                      <p className="text-xl font-bold">{formatCurrency(report.kpis.totalLossValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Tempo de Processo</h3>
                  </div>
                  <p className="text-2xl font-bold">{report.totalTimeSpent}h</p>
                  <p className="text-sm text-muted-foreground">Tempo total gasto na contagem</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Participantes</h3>
                  </div>
                  <p className="text-2xl font-bold">{report.participants.length}</p>
                  <p className="text-sm text-muted-foreground">Pessoas envolvidas na contagem</p>
                </CardContent>
              </Card>
            </div>

            {/* Participants */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participantes da Contagem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">C1</TableHead>
                      <TableHead className="text-center">C2</TableHead>
                      <TableHead className="text-center">C3</TableHead>
                      <TableHead className="text-center">C4</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.participants.map((participant) => (
                      <TableRow key={participant.userId}>
                        <TableCell className="font-medium">
                          {participant.userName}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {participant.itemsCounted}
                        </TableCell>
                        <TableCell className="text-center">
                          {participant.count1Items}
                        </TableCell>
                        <TableCell className="text-center">
                          {participant.count2Items}
                        </TableCell>
                        <TableCell className="text-center">
                          {participant.count3Items}
                        </TableCell>
                        <TableCell className="text-center">
                          {participant.count4Items}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumo do Inventário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Counting Summary */}
                  <div>
                    <h4 className="font-semibold mb-3">Totais por Contagem</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>1ª Contagem (C1)</span>
                        <Badge variant="outline">{report.countingSummary.count1Items}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>2ª Contagem (C2)</span>
                        <Badge variant="outline">{report.countingSummary.count2Items}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>3ª Contagem (C3)</span>
                        <Badge variant="outline">{report.countingSummary.count3Items}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Auditoria (C4)</span>
                        <Badge variant="outline">{report.countingSummary.count4Items}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Summary */}
                  <div>
                    <h4 className="font-semibold mb-3">Detalhamento das Divergências</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Itens Precisos
                        </span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {report.accuracy.accurateItems}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Itens Divergentes
                        </span>
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {report.accuracy.divergentItems}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Ajustes Positivos
                        </span>
                        <Badge variant="outline">{report.differences.positiveAdjustments}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                          Ajustes Negativos
                        </span>
                        <Badge variant="outline">{report.differences.negativeAdjustments}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valores dos Bens Inventariados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Valor Esperado</p>
                    <p className="text-lg font-semibold">{formatCurrency(report.inventoryValues.expectedValue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Valor Final</p>
                    <p className="text-lg font-semibold">{formatCurrency(report.inventoryValues.finalValue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Diferença</p>
                    <p className={`text-lg font-semibold ${
                      report.financial.differenceValue >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(report.financial.differenceValue)}
                    </p>
                  </div>
                </div>
                {report.financial.impactPercentage !== 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Impacto: <span className={`font-semibold ${
                        report.financial.impactPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {report.financial.impactPercentage > 0 ? '+' : ''}
                        {report.financial.impactPercentage.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Locations and Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Locais Selecionados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.selectedLocations.length > 0 ? (
                    <div className="space-y-1">
                      {report.selectedLocations.map((location) => (
                        <Badge key={location.id} variant="outline" className="mr-2 mb-1">
                          {location.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum local específico selecionado</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tags className="h-4 w-4" />
                    Categorias Selecionadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.selectedCategories.length > 0 ? (
                    <div className="space-y-1">
                      {report.selectedCategories.map((category) => (
                        <Badge key={category.id} variant="outline" className="mr-2 mb-1">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma categoria específica selecionada</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Divergent Items */}
            {report.divergentItems.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Itens com Divergências ({report.divergentItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-center">Esperado</TableHead>
                        <TableHead className="text-center">Contado</TableHead>
                        <TableHead className="text-center">Diferença</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.divergentItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.productSku}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.locationName}</TableCell>
                          <TableCell className="text-center">{item.expectedQuantity}</TableCell>
                          <TableCell className="text-center">{item.finalQuantity}</TableCell>
                          <TableCell className={`text-center font-semibold ${
                            item.difference >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            item.totalValue >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(item.totalValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {report.kpis.accuracyRate < 90 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-semibold text-yellow-800">⚠️ Taxa de Acuracidade Baixa</p>
                      <p className="text-yellow-700">
                        A taxa de acuracidade ({report.kpis.accuracyRate.toFixed(1)}%) está abaixo do recomendado (90%). 
                        Considere revisar os processos de contagem e treinamento da equipe.
                      </p>
                    </div>
                  )}
                  
                  {report.differences.adjustmentCount > report.totalItems * 0.1 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="font-semibold text-orange-800">📊 Alto Número de Divergências</p>
                      <p className="text-orange-700">
                        Mais de 10% dos itens apresentaram divergências. Recomenda-se análise dos controles 
                        de estoque e possível implementação de contagens cíclicas.
                      </p>
                    </div>
                  )}
                  
                  {Math.abs(report.financial.impactPercentage) > 5 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-semibold text-red-800">💰 Impacto Financeiro Significativo</p>
                      <p className="text-red-700">
                        O impacto financeiro ({report.financial.impactPercentage.toFixed(2)}%) é considerável. 
                        Analise as causas raiz das divergências para evitar perdas futuras.
                      </p>
                    </div>
                  )}
                  
                  {report.kpis.accuracyRate >= 95 && report.differences.adjustmentCount <= report.totalItems * 0.05 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-800">✅ Excelente Performance</p>
                      <p className="text-green-700">
                        O inventário apresentou excelentes resultados com alta acuracidade e baixo número de divergências. 
                        Continue mantendo os controles atuais.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground print:text-xs border-t pt-4">
              <p>Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p>Sistema de Inventário - Módulo Locador</p>
            </div>
          </div>
        ) : selectedInventoryId && isLoadingReport ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-base font-medium">Gerando relatório...</div>
                <div className="text-sm text-muted-foreground">
                  Processando dados do inventário...
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
                Escolha um inventário fechado acima para gerar o relatório final
              </p>
              {closedInventories.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhum inventário fechado encontrado
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}