import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  RefreshCw,
  Users,
  Lock,
  Unlock,
  Eye,
  Settings
} from "lucide-react";

interface TestScenario {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  results?: TestResult[];
  duration?: number;
}

interface TestResult {
  step: string;
  expected: string;
  actual: string;
  status: 'passed' | 'failed';
  details?: string;
}

interface ValidationTest {
  id: string;
  category: string;
  test: string;
  status: 'pending' | 'passed' | 'failed';
  message?: string;
}

export default function InventoryTestValidation() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Test scenarios for different inventory flows
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([
    {
      id: 'scenario-1',
      name: 'Cenário 1: C1=C2=Estoque (Aprovação Automática)',
      description: 'Testa inventário onde primeira e segunda contagem batem com o estoque esperado',
      expectedOutcome: 'Status deve ir direto para count2_completed sem precisar de terceira contagem',
      status: 'pending'
    },
    {
      id: 'scenario-2', 
      name: 'Cenário 2: C1=C2≠Estoque (Discrepância Consistente)',
      description: 'Testa inventário onde C1 e C2 são iguais mas diferentes do estoque',
      expectedOutcome: 'Status deve ir para count2_completed com finalQuantity = C2',
      status: 'pending'
    },
    {
      id: 'scenario-3',
      name: 'Cenário 3: C1≠C2≠Estoque (Terceira Contagem)',
      description: 'Testa inventário com divergências que exigem terceira contagem',
      expectedOutcome: 'Status deve ir para count3_required e depois audit_mode',
      status: 'pending'
    },
    {
      id: 'scenario-4',
      name: 'Cenário 4: Processo de Auditoria (Mesa de Controle)',
      description: 'Testa fluxo completo de auditoria com count4 e finalização',
      expectedOutcome: 'Apenas Admin/Gerente/Supervisor podem alterar count4',
      status: 'pending'
    }
  ]);

  // Permission validation tests
  const [permissionTests, setPermissionTests] = useState<ValidationTest[]>([
    {
      id: 'perm-1',
      category: 'Permissions',
      test: 'Usuário normal não pode acessar audit_mode',
      status: 'pending'
    },
    {
      id: 'perm-2', 
      category: 'Permissions',
      test: 'Admin pode alterar count4 em audit_mode',
      status: 'pending'
    },
    {
      id: 'perm-3',
      category: 'Permissions',
      test: 'Gerente pode alterar count4 em audit_mode',
      status: 'pending'
    },
    {
      id: 'perm-4',
      category: 'Permissions',
      test: 'Supervisor pode alterar count4 em audit_mode',
      status: 'pending'
    },
    {
      id: 'perm-5',
      category: 'Permissions',
      test: 'count4 atualiza automaticamente finalQuantity',
      status: 'pending'
    }
  ]);

  // Status transition tests
  const [statusTests, setStatusTests] = useState<ValidationTest[]>([
    {
      id: 'status-1',
      category: 'Status Transitions',
      test: 'count2_closed → count2_completed (quando todos têm finalQuantity)',
      status: 'pending'
    },
    {
      id: 'status-2',
      category: 'Status Transitions', 
      test: 'count2_closed → count3_required (quando há itens sem finalQuantity)',
      status: 'pending'
    },
    {
      id: 'status-3',
      category: 'Status Transitions',
      test: 'count3_closed → audit_mode (automaticamente)',
      status: 'pending'
    },
    {
      id: 'status-4',
      category: 'Status Transitions',
      test: 'audit_mode → closed (quando todos têm finalQuantity)',
      status: 'pending'
    }
  ]);

  // Run individual test scenario
  const runScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      return await apiRequest(`/api/test/run-scenario/${scenarioId}`, 'POST');
    },
    onMutate: (scenarioId) => {
      setRunningTests(prev => new Set([...Array.from(prev), scenarioId]));
      setTestScenarios(prev => prev.map(scenario => 
        scenario.id === scenarioId 
          ? { ...scenario, status: 'running' }
          : scenario
      ));
    },
    onSuccess: (data: any, scenarioId) => {
      setTestScenarios(prev => prev.map(scenario => 
        scenario.id === scenarioId 
          ? { 
              ...scenario, 
              status: data.success ? 'passed' : 'failed',
              results: data.results,
              duration: data.duration
            }
          : scenario
      ));
      setRunningTests(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(scenarioId);
        return newSet;
      });
      
      toast({
        title: data.success ? "Teste passou" : "Teste falhou",
        description: `${scenarioId}: ${data.message}`,
      });
    },
    onError: (error: any, scenarioId) => {
      setTestScenarios(prev => prev.map(scenario => 
        scenario.id === scenarioId 
          ? { ...scenario, status: 'failed' }
          : scenario
      ));
      setRunningTests(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(scenarioId);
        return newSet;
      });
      
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Run validation tests
  const runValidationMutation = useMutation({
    mutationFn: async (category: string) => {
      return await apiRequest(`/api/test/validate-${category.toLowerCase()}`, 'POST');
    },
    onSuccess: (data: any, category) => {
      if (category === 'permissions') {
        setPermissionTests(prev => prev.map(test => {
          const result = data.results.find((r: any) => r.id === test.id);
          return result ? { ...test, status: result.status, message: result.message } : test;
        }));
      } else if (category === 'status') {
        setStatusTests(prev => prev.map(test => {
          const result = data.results.find((r: any) => r.id === test.id);
          return result ? { ...test, status: result.status, message: result.message } : test;
        }));
      }
      
      toast({
        title: "Validação concluída",
        description: `Testes de ${category} executados com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Run all tests
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/test/run-all', 'POST');
    },
    onSuccess: (data: any) => {
      // Update all test states based on results
      if (data.scenarios) {
        setTestScenarios(prev => prev.map(scenario => {
          const result = data.scenarios.find((r: any) => r.id === scenario.id);
          return result ? { ...scenario, ...result } : scenario;
        }));
      }
      
      if (data.permissions) {
        setPermissionTests(prev => prev.map(test => {
          const result = data.permissions.find((r: any) => r.id === test.id);
          return result ? { ...test, status: result.status, message: result.message } : test;
        }));
      }
      
      if (data.statusTransitions) {
        setStatusTests(prev => prev.map(test => {
          const result = data.statusTransitions.find((r: any) => r.id === test.id);
          return result ? { ...test, status: result.status, message: result.message } : test;
        }));
      }
      
      toast({
        title: "Todos os testes concluídos",
        description: `${data.passed}/${data.total} testes passaram`,
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'passed': 'default',
      'failed': 'destructive', 
      'running': 'secondary',
      'pending': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Filter tests by category
  const filteredPermissionTests = selectedCategory === 'all' || selectedCategory === 'permissions' 
    ? permissionTests : [];
  const filteredStatusTests = selectedCategory === 'all' || selectedCategory === 'status' 
    ? statusTests : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Testes e Validações do Sistema</h1>
            <p className="text-muted-foreground">
              Suite completa de testes para validar fluxos de inventário, transições de status e permissões
            </p>
          </div>
          <TestTube className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Controles de Teste</CardTitle>
            <CardDescription>
              Execute testes individuais ou a suite completa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  <SelectItem value="scenarios">Cenários de Teste</SelectItem>
                  <SelectItem value="permissions">Permissões</SelectItem>
                  <SelectItem value="status">Transições de Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => runAllTestsMutation.mutate()}
                disabled={runAllTestsMutation.isPending}
                className="flex items-center gap-2"
              >
                {runAllTestsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Executar Todos os Testes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Scenarios */}
        {(selectedCategory === 'all' || selectedCategory === 'scenarios') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cenários de Teste
              </CardTitle>
              <CardDescription>
                Cenários específicos que testam diferentes fluxos de inventário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testScenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(scenario.status)}
                          <h3 className="font-semibold">{scenario.name}</h3>
                          {getStatusBadge(scenario.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {scenario.description}
                        </p>
                        <p className="text-sm font-medium">
                          <strong>Resultado esperado:</strong> {scenario.expectedOutcome}
                        </p>
                        {scenario.duration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Executado em {scenario.duration}ms
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => runScenarioMutation.mutate(scenario.id)}
                        disabled={runningTests.has(scenario.id)}
                        variant={scenario.status === 'passed' ? 'outline' : 'default'}
                      >
                        {runningTests.has(scenario.id) ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Test Results */}
                    {scenario.results && scenario.results.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2">Resultados Detalhados:</h4>
                        <div className="space-y-2">
                          {scenario.results.map((result, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              {getStatusIcon(result.status)}
                              <div className="flex-1">
                                <p className="font-medium">{result.step}</p>
                                <p className="text-muted-foreground">
                                  Esperado: {result.expected}
                                </p>
                                <p className="text-muted-foreground">
                                  Atual: {result.actual}
                                </p>
                                {result.details && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {result.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Permission Tests */}
        {filteredPermissionTests.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Testes de Permissão
                  </CardTitle>
                  <CardDescription>
                    Validação de controles de acesso e permissões de usuário
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => runValidationMutation.mutate('permissions')}
                  disabled={runValidationMutation.isPending}
                >
                  {runValidationMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Executar Testes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Teste</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissionTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(test.status)}
                            {getStatusBadge(test.status)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{test.test}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {test.message || 'Aguardando execução'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Transition Tests */}
        {filteredStatusTests.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Testes de Transição de Status
                  </CardTitle>
                  <CardDescription>
                    Validação das transições automáticas de status do inventário
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => runValidationMutation.mutate('status')}
                  disabled={runValidationMutation.isPending}
                >
                  {runValidationMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Executar Testes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Transição</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStatusTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(test.status)}
                            {getStatusBadge(test.status)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{test.test}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {test.message || 'Aguardando execução'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {[...testScenarios, ...permissionTests, ...statusTests].filter(t => t.status === 'passed').length}
                </p>
                <p className="text-sm text-muted-foreground">Passou</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {[...testScenarios, ...permissionTests, ...statusTests].filter(t => t.status === 'failed').length}
                </p>
                <p className="text-sm text-muted-foreground">Falhou</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {[...testScenarios, ...permissionTests, ...statusTests].filter(t => t.status === 'running').length}
                </p>
                <p className="text-sm text-muted-foreground">Executando</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {[...testScenarios, ...permissionTests, ...statusTests].filter(t => t.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pendente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}