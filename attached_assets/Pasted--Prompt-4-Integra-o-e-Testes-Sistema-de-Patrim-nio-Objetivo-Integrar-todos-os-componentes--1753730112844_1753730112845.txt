
# Prompt 4: Integração e Testes - Sistema de Patrimônio

## Objetivo
Integrar todos os componentes implementados, realizar testes abrangentes e criar ferramentas de validação para o sistema de controle de patrimônio no inventário.

## Plano de Testes de Integração

### 1. Cenários de Teste

#### Cenário A: Produto com Controle de Série
```typescript
// Teste completo do fluxo de número de série
const testSerialControlFlow = async () => {
  // 1. Criar inventário
  const inventory = await createTestInventory();
  
  // 2. Inicializar itens de série
  await initializeSerialItems(inventory.id);
  
  // 3. Simular leituras de série
  const serialNumbers = ['SER001', 'SER002', 'SER003'];
  for (const serial of serialNumbers) {
    const result = await registerSerialReading(inventory.id, serial, 'count1');
    expect(result.success).toBe(true);
  }
  
  // 4. Verificar reconciliação
  await reconcileInventory(inventory.id);
  const reconciliation = await getReconciliationReport(inventory.id);
  
  // 5. Validar resultados
  expect(reconciliation.serialItemsFound).toBe(3);
  expect(reconciliation.hasDiscrepancy).toBe(false);
};
```

#### Cenário B: Produto sem Controle de Série
```typescript
const testManualQuantityFlow = async () => {
  // 1. Buscar produto por SKU
  const product = await searchProductBySKU('SKU001');
  expect(product.hasSerialControl).toBe(false);
  
  // 2. Registrar quantidade manual
  const result = await registerManualCount(product.id, 50);
  expect(result.success).toBe(true);
  
  // 3. Verificar contagem
  const inventoryItem = await getInventoryItem(product.id);
  expect(inventoryItem.count1).toBe(50);
};
```

#### Cenário C: Discrepâncias e Validações
```typescript
const testDiscrepancyHandling = async () => {
  // 1. Produto com série mas contagem manual incorreta
  const product = await createProductWithSerial();
  
  // 2. Registrar apenas 2 séries de 3 esperadas
  await registerSerialReading(inventory.id, 'SER001', 'count1');
  await registerSerialReading(inventory.id, 'SER002', 'count1');
  
  // 3. Tentar registrar quantidade manual de 3
  const manualResult = await registerManualCount(product.id, 3);
  
  // 4. Reconciliar e verificar discrepância
  await reconcileInventory(inventory.id);
  const item = await getInventoryItem(product.id);
  expect(item.hasSerialDiscrepancy).toBe(true);
};
```

### 2. Ferramentas de Validação

#### Validador de Integridade
```typescript
class InventoryIntegrityValidator {
  async validateInventoryIntegrity(inventoryId: number): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    
    // 1. Verificar se produtos com série têm registros de série
    const productsWithSerial = await this.getProductsWithSerialControl(inventoryId);
    for (const product of productsWithSerial) {
      const expectedSerials = await this.getExpectedSerials(inventoryId, product.id);
      const foundSerials = await this.getFoundSerials(inventoryId, product.id);
      
      if (expectedSerials.length !== foundSerials.length) {
        issues.push({
          type: 'SERIAL_MISMATCH',
          productId: product.id,
          expected: expectedSerials.length,
          found: foundSerials.length
        });
      }
    }
    
    // 2. Verificar duplicação de séries
    const duplicateSerials = await this.findDuplicateSerials(inventoryId);
    for (const duplicate of duplicateSerials) {
      issues.push({
        type: 'DUPLICATE_SERIAL',
        serialNumber: duplicate.serialNumber,
        count: duplicate.count
      });
    }
    
    // 3. Verificar quantidades vs séries
    const quantityMismatches = await this.findQuantityMismatches(inventoryId);
    for (const mismatch of quantityMismatches) {
      issues.push({
        type: 'QUANTITY_SERIAL_MISMATCH',
        productId: mismatch.productId,
        manualQuantity: mismatch.manualQuantity,
        serialQuantity: mismatch.serialQuantity
      });
    }
    
    return {
      inventoryId,
      isValid: issues.length === 0,
      issues,
      timestamp: Date.now()
    };
  }
}
```

#### Relatório de Reconciliação
```typescript
interface ReconciliationReport {
  inventoryId: number;
  summary: {
    totalProducts: number;
    productsWithSerial: number;
    productsManual: number;
    serialItemsExpected: number;
    serialItemsFound: number;
    serialItemsMissing: number;
    productsWithDiscrepancy: number;
  };
  productDetails: ProductReconciliation[];
  serialDiscrepancies: SerialDiscrepancy[];
  recommendations: string[];
}

const generateReconciliationReport = async (inventoryId: number): Promise<ReconciliationReport> => {
  const summary = await calculateSummary(inventoryId);
  const productDetails = await getProductReconciliationDetails(inventoryId);
  const discrepancies = await findSerialDiscrepancies(inventoryId);
  const recommendations = generateRecommendations(summary, discrepancies);
  
  return {
    inventoryId,
    summary,
    productDetails,
    serialDiscrepancies: discrepancies,
    recommendations
  };
};
```

### 3. Interface de Validação

#### Tela de Reconciliação
```tsx
const InventoryReconciliationPage = ({ inventoryId }: { inventoryId: number }) => {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const runReconciliation = async () => {
    setIsValidating(true);
    try {
      const reconciliationReport = await generateReconciliationReport(inventoryId);
      setReport(reconciliationReport);
    } catch (error) {
      toast.error('Erro na reconciliação');
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reconciliação de Inventário</h1>
        <Button onClick={runReconciliation} disabled={isValidating}>
          {isValidating ? <Loader2 className="animate-spin" /> : 'Executar Reconciliação'}
        </Button>
      </div>
      
      {/* Resumo */}
      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.summary.totalProducts}
                  </div>
                  <div className="text-sm text-gray-600">Total de Produtos</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {report.summary.serialItemsFound}
                  </div>
                  <div className="text-sm text-gray-600">Séries Encontradas</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {report.summary.serialItemsMissing}
                  </div>
                  <div className="text-sm text-gray-600">Séries Faltando</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {report.summary.productsWithDiscrepancy}
                  </div>
                  <div className="text-sm text-gray-600">Com Discrepância</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Discrepâncias */}
          {report.serialDiscrepancies.length > 0 && (
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
                    {report.serialDiscrepancies.map((discrepancy, index) => (
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
          <Card>
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
```

### 4. Testes Automatizados

#### Testes de API
```typescript
describe('Serial Control API', () => {
  test('should register serial reading successfully', async () => {
    const response = await request(app)
      .post(`/api/inventories/${testInventoryId}/serial-reading`)
      .send({
        serialNumber: 'TEST001',
        countStage: 'count1'
      })
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.productId).toBeDefined();
  });
  
  test('should prevent duplicate serial reading', async () => {
    // Primeiro registro
    await request(app)
      .post(`/api/inventories/${testInventoryId}/serial-reading`)
      .send({
        serialNumber: 'TEST002',
        countStage: 'count1'
      });
      
    // Segundo registro (deve falhar)
    const response = await request(app)
      .post(`/api/inventories/${testInventoryId}/serial-reading`)
      .send({
        serialNumber: 'TEST002',
        countStage: 'count1'
      })
      .expect(200);
      
    expect(response.body.success).toBe(false);
    expect(response.body.alreadyRead).toBe(true);
  });
});
```

#### Testes de Interface
```typescript
describe('Mobile Counting Interface', () => {
  test('should switch between serial and SKU input modes', async () => {
    render(<MobileCounting />);
    
    // Verificar modo padrão
    expect(screen.getByPlaceholderText(/escaneie o código/i)).toBeInTheDocument();
    
    // Mudar para modo SKU
    fireEvent.click(screen.getByText(/busca por sku/i));
    expect(screen.getByPlaceholderText(/digite sku/i)).toBeInTheDocument();
  });
  
  test('should add product to list after serial scan', async () => {
    render(<MobileCounting />);
    
    const serialInput = screen.getByPlaceholderText(/escaneie o código/i);
    fireEvent.change(serialInput, { target: { value: 'TEST003' } });
    fireEvent.click(screen.getByText(/ler/i));
    
    await waitFor(() => {
      expect(screen.getByText(/produto adicionado/i)).toBeInTheDocument();
    });
  });
});
```

### 5. Monitoramento e Logs

#### Sistema de Logs Estruturados
```typescript
class InventoryLogger {
  logSerialReading(data: {
    inventoryId: number;
    serialNumber: string;
    userId: string;
    countStage: string;
    success: boolean;
    productId?: number;
  }) {
    console.log(JSON.stringify({
      event: 'SERIAL_READING',
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
  
  logDiscrepancy(data: {
    inventoryId: number;
    productId: number;
    type: string;
    expected: number;
    found: number;
  }) {
    console.log(JSON.stringify({
      event: 'DISCREPANCY_DETECTED',
      level: 'WARNING',
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
}
```

## Checklist de Implementação

### Database
- [ ] Executar scripts de criação de tabelas
- [ ] Validar índices e foreign keys
- [ ] Testar stored procedures
- [ ] Verificar performance de consultas

### Backend
- [ ] Implementar todas as APIs documentadas
- [ ] Adicionar validações de entrada
- [ ] Configurar logs de auditoria
- [ ] Testes unitários para cada método

### Frontend
- [ ] Refatorar interface mobile
- [ ] Criar tela de reconciliação
- [ ] Implementar validações client-side
- [ ] Testes de componentes

### Integração
- [ ] Testes end-to-end completos
- [ ] Validação de performance
- [ ] Testes de carga
- [ ] Documentação de uso

### Deploy e Monitoramento
- [ ] Configurar logs estruturados
- [ ] Implementar métricas de uso
- [ ] Criar alertas para discrepâncias
- [ ] Documentar troubleshooting

## Próximos Passos

1. Executar todos os prompts em sequência
2. Realizar testes de integração
3. Ajustar conforme feedback dos testes
4. Documentar processos e procedimentos
5. Treinamento de usuários finais
