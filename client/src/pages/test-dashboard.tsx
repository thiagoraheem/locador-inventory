import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  scenario: string;
  success: boolean;
  steps: TestStep[];
  error?: string;
  metadata?: any;
}

interface TestStep {
  step: string;
  success: boolean;
  data?: any;
}

export default function TestDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const testScenarios = [
    {
      id: 'serial-control-flow',
      name: 'Controle de Série',
      description: 'Testa o fluxo completo de leitura e validação de números de série',
      endpoint: '/api/test/serial-control-flow'
    },
    {
      id: 'manual-quantity-flow',
      name: 'Quantidade Manual',
      description: 'Testa o registro de quantidades para produtos sem série',
      endpoint: '/api/test/manual-quantity-flow'
    },
    {
      id: 'discrepancy-handling',
      name: 'Tratamento de Discrepâncias',
      description: 'Testa a detecção e resolução de discrepâncias',
      endpoint: '/api/test/discrepancy-handling'
    },
    {
      id: 'large-volume-performance',
      name: 'Performance de Alto Volume',
      description: 'Testa performance com grande volume de registros',
      endpoint: '/api/test/large-volume-performance'
    }
  ];

  const runTest = async (scenario: any) => {
    setRunningTests(prev => new Set([...prev, scenario.id]));
    
    try {
      const response = await fetch(scenario.endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      setTestResults(prev => {
        const filtered = prev.filter(r => r.scenario !== result.scenario);
        return [...filtered, result];
      });

      toast({
        title: result.success ? "Teste concluído com sucesso" : "Teste falhou",
        description: `${scenario.name}: ${result.success ? 'Todos os passos executados' : result.error}`,
        variant: result.success ? "default" : "destructive",
      });

    } catch (error) {
      toast({
        title: "Erro na execução do teste",
        description: `Falha ao executar ${scenario.name}`,
        variant: "destructive",
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenario.id);
        return newSet;
      });
    }
  };

  const runAllTests = async () => {
    for (const scenario of testScenarios) {
      if (!runningTests.has(scenario.id)) {
        await runTest(scenario);
        // Aguardar um pouco entre testes para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const getTestStatus = (scenarioId: string): 'idle' | 'running' | 'success' | 'error' => {
    if (runningTests.has(scenarioId)) return 'running';
    
    const result = testResults.find(r => r.scenario.toLowerCase().replace('_', '-') === scenarioId);
    if (!result) return 'idle';
    
    return result.success ? 'success' : 'error';
  };

  const getTestResult = (scenarioId: string): TestResult | undefined => {
    return testResults.find(r => r.scenario.toLowerCase().replace('_', '-') === scenarioId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Testes</h1>
          <p className="text-gray-600">Execute e monitore cenários de teste do sistema de patrimônio</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={runningTests.size > 0}>
            <Play className="h-4 w-4 mr-2" />
            Executar Todos
          </Button>
        </div>
      </div>

      {/* Resumo dos Testes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {testScenarios.length}
              </div>
              <div className="text-sm text-gray-600">Total de Cenários</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(r => r.success).length}
              </div>
              <div className="text-sm text-gray-600">Sucessos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(r => !r.success).length}
              </div>
              <div className="text-sm text-gray-600">Falhas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {runningTests.size}
              </div>
              <div className="text-sm text-gray-600">Em Execução</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Cenários */}
      <Card>
        <CardHeader>
          <CardTitle>Cenários de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cenário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testScenarios.map((scenario) => {
                const status = getTestStatus(scenario.id);
                const result = getTestResult(scenario.id);
                
                return (
                  <TableRow key={scenario.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{scenario.name}</div>
                        <div className="text-sm text-gray-600">{scenario.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {status === 'idle' && <Badge variant="outline">Não Executado</Badge>}
                      {status === 'running' && (
                        <Badge variant="outline" className="text-blue-600">
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                          Executando
                        </Badge>
                      )}
                      {status === 'success' && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sucesso
                        </Badge>
                      )}
                      {status === 'error' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Falha
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result && (
                        <div className="text-sm">
                          <div>{result.steps.length} passos executados</div>
                          {result.metadata && (
                            <div className="text-gray-600">
                              {result.metadata.duration && `${result.metadata.duration}ms`}
                              {result.metadata.throughput && ` (${result.metadata.throughput.toFixed(2)} ops/s)`}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTest(scenario)}
                          disabled={runningTests.has(scenario.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Executar
                        </Button>
                        {result && (
                          <Button size="sm" variant="outline">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Detalhes
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resultados Detalhados */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{result.scenario.replace(/_/g, ' ').toUpperCase()}</h4>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "SUCESSO" : "FALHA"}
                    </Badge>
                  </div>
                  
                  {result.error && (
                    <div className="text-red-600 text-sm mb-2">{result.error}</div>
                  )}
                  
                  <div className="text-sm space-y-1">
                    {result.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-2">
                        {step.success ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span>{step.step.replace(/_/g, ' ')}</span>
                        {step.data && (
                          <span className="text-gray-500">
                            {typeof step.data === 'object' ? JSON.stringify(step.data) : step.data}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}