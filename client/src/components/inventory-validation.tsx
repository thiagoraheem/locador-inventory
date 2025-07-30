import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  FileText,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ValidationIssue {
  type: string;
  productId?: number;
  serialNumber?: string;
  expected?: number;
  found?: number;
  count?: number;
  manualQuantity?: number;
  serialQuantity?: number;
}

interface ValidationReport {
  inventoryId: number;
  isValid: boolean;
  issues: ValidationIssue[];
  timestamp: number;
}

interface ReconciliationSummary {
  totalProducts: number;
  productsWithSerial: number;
  productsManual: number;
  serialItemsExpected: number;
  serialItemsFound: number;
  serialItemsMissing: number;
  productsWithDiscrepancy: number;
}

interface ReconciliationReport {
  inventoryId: number;
  summary: ReconciliationSummary;
  productDetails: any[];
  serialDiscrepancies: any[];
  recommendations: string[];
}

interface InventoryValidationProps {
  inventoryId: number;
}

export default function InventoryValidation({ inventoryId }: InventoryValidationProps) {
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const { toast } = useToast();

  // Função para executar validação de integridade
  const runValidation = async () => {
    setIsValidating(true);
    try {
      const response = await fetch(`/api/inventories/${inventoryId}/validate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha na validação');
      }

      const report = await response.json();
      setValidationReport(report);

      toast({
        title: report.isValid ? "Validação concluída" : "Problemas encontrados",
        description: report.isValid 
          ? "Inventário está íntegro" 
          : `${report.issues.length} problemas encontrados`,
        variant: report.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Erro na validação",
        description: "Falha ao executar validação de integridade",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Função para executar reconciliação
  const runReconciliation = async () => {
    setIsReconciling(true);
    try {
      const response = await fetch(`/api/inventories/${inventoryId}/reconcile`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha na reconciliação');
      }

      // Buscar relatório de reconciliação
      const reportResponse = await fetch(`/api/inventories/${inventoryId}/reconciliation`, {
        credentials: 'include',
      });

      if (!reportResponse.ok) {
        throw new Error('Falha ao buscar relatório');
      }

      const report = await reportResponse.json();
      setReconciliationReport(report);

      toast({
        title: "Reconciliação concluída",
        description: "Relatório de reconciliação gerado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro na reconciliação",
        description: "Falha ao executar reconciliação",
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'SERIAL_MISMATCH':
      case 'QUANTITY_SERIAL_MISMATCH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'DUPLICATE_SERIAL':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getIssueDescription = (issue: ValidationIssue) => {
    switch (issue.type) {
      case 'SERIAL_MISMATCH':
        return `Discrepância de séries - Esperado: ${issue.expected}, Encontrado: ${issue.found}`;
      case 'DUPLICATE_SERIAL':
        return `Série duplicada: ${issue.serialNumber} (${issue.count} ocorrências)`;
      case 'QUANTITY_SERIAL_MISMATCH':
        return `Quantidade manual (${issue.manualQuantity}) não confere com séries (${issue.serialQuantity})`;
      default:
        return 'Problema não especificado';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Validação e Reconciliação</h1>
        <div className="flex gap-2">
          <Button 
            onClick={runValidation} 
            disabled={isValidating}
            variant="outline"
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Validar Integridade
          </Button>
          <Button 
            onClick={runReconciliation} 
            disabled={isReconciling}
          >
            {isReconciling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Executar Reconciliação
          </Button>
        </div>
      </div>

      {/* Relatório de Validação */}
      {validationReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationReport.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Relatório de Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={validationReport.isValid ? "default" : "destructive"}>
                  {validationReport.isValid ? "VÁLIDO" : "PROBLEMAS ENCONTRADOS"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Executado em: {new Date(validationReport.timestamp).toLocaleString()}
                </span>
              </div>

              {!validationReport.isValid && validationReport.issues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Problemas Identificados:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Produto ID</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationReport.issues.map((issue, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getIssueIcon(issue.type)}
                              <span className="text-sm">{issue.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{issue.productId || '-'}</TableCell>
                          <TableCell>{getIssueDescription(issue)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              Investigar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Reconciliação */}
      {reconciliationReport && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Reconciliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {reconciliationReport.summary.totalProducts}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Produtos</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reconciliationReport.summary.serialItemsFound}
                  </div>
                  <div className="text-sm text-muted-foreground">Séries Encontradas</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {reconciliationReport.summary.serialItemsMissing}
                  </div>
                  <div className="text-sm text-muted-foreground">Séries Faltando</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {reconciliationReport.summary.productsWithDiscrepancy}
                  </div>
                  <div className="text-sm text-muted-foreground">Com Discrepância</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discrepâncias */}
          {reconciliationReport.serialDiscrepancies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Discrepâncias Encontradas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Esperado</TableHead>
                      <TableHead>Encontrado</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationReport.serialDiscrepancies.map((discrepancy, index) => (
                      <TableRow key={index}>
                        <TableCell>{discrepancy.productName}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{discrepancy.type}</Badge>
                        </TableCell>
                        <TableCell>{discrepancy.expected}</TableCell>
                        <TableCell>{discrepancy.found}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Investigar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recomendações */}
          {reconciliationReport.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reconciliationReport.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}