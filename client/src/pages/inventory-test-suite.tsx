import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Users,
  Shield,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Inventory } from "@shared/schema";

interface TestScenario {
  id: string;
  name: string;
  description: string;
  type: 'flow' | 'validation' | 'permission';
  status: 'pending' | 'running' | 'passed' | 'failed';
  results?: string[];
  errors?: string[];
}

interface TestResult {
  scenarioId: string;
  passed: boolean;
  message: string;
  details?: any;
}

export default function InventoryTestSuite() {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventories
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  // Test scenarios
  const [testScenarios] = useState<TestScenario[]>([
    {
      id: 'scenario_1',
      name: 'Cenário 1: C1=C2=Estoque (Aprovação Automática)',
      description: 'Testa inventário onde primeira e segunda contagem batem com estoque atual',
      type: 'flow',
      status: 'pending'
    },
    {
      id: 'scenario_2', 
      name: 'Cenário 2: C1=C2≠Estoque (Discrepância Consistente)',
      description: 'Testa inventário onde C1 e C2 são iguais mas diferentes do estoque',
      type: 'flow',
      status: 'pending'
    },
    {
      id: 'scenario_3',
      name: 'Cenário 3: C1≠C2≠Estoque (Terceira Contagem Obrigatória)',
      description: 'Testa inventário onde C1, C2 e estoque são todos diferentes',
      type: 'flow',
      status: 'pending'
    },
    {
      id: 'scenario_4',
      name: 'Cenário 4: Processo de Auditoria',
      description: 'Testa fluxo completo de auditoria na Mesa de Controle',
      type: 'flow',
      status: 'pending'
    },
    {
      id: 'validation_1',
      name: 'Validação: Transições de Status',
      description: 'Valida transições count2_closed → count2_completed/count3_required',
      type: 'validation',
      status: 'pending'
    },
    {
      id: 'validation_2',
      name: 'Validação: Modo Auditoria',
      description: 'Valida transição count3_closed → audit_mode → closed',
      type: 'validation',
      status: 'pending'
    },
    {
      id: 'permission_1',
      name: 'Permissão: Usuários Normais em Auditoria',
      description: 'Testa que usuários normais não podem alterar em audit_mode',
      type: 'permission',
      status: 'pending'
    },
    {
      id: 'permission_2',
      name: 'Permissão: Mesa de Controle C4',
      description: 'Testa que Mesa de Controle pode alterar count4',
      type: 'permission',
      status: 'pending'
    },
    {
      id: 'validation_3',
      name: 'Validação: Atualização Automática C4',
      description: 'Testa que count4 atualiza automaticamente finalQuantity',
      type: 'validation',
      status: 'pending'
    }
  ]);

  // Create test inventory mutation
  const createTestInventoryMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      const response = await fetch('/api/test/create-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scenarioId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test inventory');
      }
      
      return response.json();
    },
    onSuccess: (data, scenarioId) => {
      toast({
        title: "Inventário de teste criado",
        description: `Inventário ${data.code} criado para ${scenarioId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar inventário de teste",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Run test scenario mutation
  const runTestMutation = useMutation({
    mutationFn: async ({ scenarioId, inventoryId }: { scenarioId: string; inventoryId: number }) => {
      const response = await fetch('/api/test/run-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scenarioId, inventoryId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to run test scenario');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setTestResults(prev => new Map(prev.set(result.scenarioId, result)));
      toast({
        title: result.passed ? "Teste passou" : "Teste falhou",
        description: result.message,
        variant: result.passed ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao executar teste",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Validate permissions mutation
  const validatePermissionsMutation = useMutation({
    mutationFn: async (inventoryId: number) => {
      const response = await fetch(`/api/test/validate-permissions/${inventoryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate permissions');
      }
      
      return response.json();
    },
    onSuccess: (results) => {
      results.forEach((result: TestResult) => {
        setTestResults(prev => new Map(prev.set(result.scenarioId, result)));
      });
      toast({
        title: "Validação de permissões concluída",
        description: `${results.filter((r: TestResult) => r.passed).length}/${results.length} testes passaram`,
      });
    }
  });

  const runScenario = async (scenarioId: string) => {
    if (!selectedInventoryId) {
      toast({
        title: "Inventário necessário",
        description: "Selecione um inventário para executar o teste",
        variant: "destructive",
      });
      return;
    }

    setRunningTests(prev => new Set(prev.add(scenarioId)));
    
    try {
      await runTestMutation.mutateAsync({ scenarioId, inventoryId: selectedInventoryId });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenarioId);
        return newSet;
      });
    }
  };

  const runAllTests = async () => {
    if (!selectedInventoryId) {
      toast({
        title: "Inventário necessário",
        description: "Selecione um inventário para executar todos os testes",
        variant: "destructive",
      });
      return;
    }

    for (const scenario of testScenarios) {
      await runScenario(scenario.id);
      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'flow': return <FileText className="h-4 w-4" />;
      case 'validation': return <CheckCircle className="h-4 w-4" />;
      case 'permission': return <Shield className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (scenarioId: string) => {
    const result = testResults.get(scenarioId);
    const isRunning = runningTests.has(scenarioId);

    if (isRunning) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Executando</Badge>;
    }

    if (result) {
      return result.passed ? 
        <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Passou</Badge> :
        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
    }

    return <Badge variant="outline">Pendente</Badge>;
  };

  const getTestStats = () => {
    const total = testScenarios.length;
    const completed = testResults.size;
    const passed = Array.from(testResults.values()).filter(r => r.passed).length;
    const failed = completed - passed;
    return { total, completed, passed, failed };
  };

  const stats = getTestStats();

  return (
    <div>
      <Header 
        title="Suite de Testes do Inventário" 
        subtitle="Validação completa de fluxos, transições e permissões" 
      />
      
      <div className="space-y-6 p-4 md:p-6">
        {/* Test Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Testes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.passed}</p>
                  <p className="text-xs text-muted-foreground">Testes Passaram</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Testes Falharam</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Executados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {stats.completed > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso dos Testes</span>
                  <span>{stats.completed}/{stats.total}</span>
                </div>
                <Progress value={(stats.completed / stats.total) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Teste</CardTitle>
            <CardDescription>
              Selecione um inventário para executar os testes de validação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Inventário de Teste</label>
                <Select value={selectedInventoryId?.toString() || ""} onValueChange={(value) => setSelectedInventoryId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um inventário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventories?.map((inventory) => (
                      <SelectItem key={inventory.id} value={inventory.id.toString()}>
                        {inventory.code} - {inventory.description || 'Sem descrição'} ({inventory.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => createTestInventoryMutation.mutate('test_scenario')}
                  disabled={createTestInventoryMutation.isPending}
                  variant="outline"
                >
                  Criar Inventário de Teste
                </Button>
                
                <Button
                  onClick={runAllTests}
                  disabled={!selectedInventoryId || runningTests.size > 0}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Executar Todos os Testes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Scenarios */}
        <Tabs defaultValue="flow" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flow">Fluxos de Inventário</TabsTrigger>
            <TabsTrigger value="validation">Validações</TabsTrigger>
            <TabsTrigger value="permission">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="flow" className="space-y-4">
            {testScenarios.filter(s => s.type === 'flow').map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getScenarioIcon(scenario.type)}
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                    </div>
                    {getStatusBadge(scenario.id)}
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {testResults.get(scenario.id) && (
                        <Alert className={testResults.get(scenario.id)?.passed ? "border-green-200" : "border-red-200"}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.get(scenario.id)?.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button
                      onClick={() => runScenario(scenario.id)}
                      disabled={!selectedInventoryId || runningTests.has(scenario.id)}
                      variant="outline"
                      size="sm"
                    >
                      {runningTests.has(scenario.id) ? "Executando..." : "Executar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {testScenarios.filter(s => s.type === 'validation').map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getScenarioIcon(scenario.type)}
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                    </div>
                    {getStatusBadge(scenario.id)}
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {testResults.get(scenario.id) && (
                        <Alert className={testResults.get(scenario.id)?.passed ? "border-green-200" : "border-red-200"}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.get(scenario.id)?.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button
                      onClick={() => runScenario(scenario.id)}
                      disabled={!selectedInventoryId || runningTests.has(scenario.id)}
                      variant="outline"
                      size="sm"
                    >
                      {runningTests.has(scenario.id) ? "Executando..." : "Executar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="permission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validação de Permissões</CardTitle>
                <CardDescription>
                  Testa diferentes níveis de acesso e permissões no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => selectedInventoryId && validatePermissionsMutation.mutate(selectedInventoryId)}
                  disabled={!selectedInventoryId || validatePermissionsMutation.isPending}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Validar Todas as Permissões
                </Button>
              </CardContent>
            </Card>

            {testScenarios.filter(s => s.type === 'permission').map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getScenarioIcon(scenario.type)}
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                    </div>
                    {getStatusBadge(scenario.id)}
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {testResults.get(scenario.id) && (
                        <Alert className={testResults.get(scenario.id)?.passed ? "border-green-200" : "border-red-200"}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.get(scenario.id)?.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Button
                      onClick={() => runScenario(scenario.id)}
                      disabled={!selectedInventoryId || runningTests.has(scenario.id)}
                      variant="outline"
                      size="sm"
                    >
                      {runningTests.has(scenario.id) ? "Executando..." : "Executar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}