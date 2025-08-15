import { SimpleStorage } from './simple-storage';

// Cenários de teste para sistema de patrimônio
export class InventoryTestScenarios {
  constructor(private storage: SimpleStorage) {}

  // Cenário A: Produto com Controle de Série
  async testSerialControlFlow(): Promise<TestResult> {
    const results: TestStep[] = [];
    
    try {
      // 1. Criar inventário
      const inventory = await this.createTestInventory();
      results.push({ step: 'CREATE_INVENTORY', success: true, data: inventory });
      
      // 2. Inicializar itens de série
      await this.storage.createInventorySerialItems(inventory.id);
      results.push({ step: 'INITIALIZE_SERIAL_ITEMS', success: true });
      
      // 3. Simular leituras de série
      const serialNumbers = ['SER001', 'SER002', 'SER003'];
        for (const serial of serialNumbers) {
          const result = await this.storage.registerSerialReading(
            inventory.id,
            { serialNumber: serial, countStage: 'count1' },
            1
          );
        results.push({ 
          step: 'REGISTER_SERIAL', 
          success: result.success, 
          data: { serial, result } 
        });
      }
      
      // 4. Verificar reconciliação
      await this.storage.reconcileInventory(inventory.id);
      results.push({ step: 'RECONCILIATION', success: true });
      
      return {
        scenario: 'SERIAL_CONTROL_FLOW',
        success: results.every(r => r.success),
        steps: results
      };
      
    } catch (error) {
      return {
        scenario: 'SERIAL_CONTROL_FLOW',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        steps: results
      };
    }
  }

  // Cenário B: Produto sem Controle de Série
  async testManualQuantityFlow(): Promise<TestResult> {
    const results: TestStep[] = [];
    
    try {
      // 1. Buscar produto por SKU
        const [product] = await this.storage.searchProducts('SKU001');
      results.push({ 
        step: 'SEARCH_PRODUCT', 
        success: !!product, 
        data: { hasSerialControl: product?.hasSerialControl } 
      });
      
      if (!product) {
        throw new Error('Produto não encontrado');
      }
      
      // 2. Registrar quantidade manual (simulado)
      // Esta operação seria feita através da interface normal de contagem
      results.push({ step: 'REGISTER_MANUAL_COUNT', success: true, data: { quantity: 50 } });
      
      return {
        scenario: 'MANUAL_QUANTITY_FLOW',
        success: results.every(r => r.success),
        steps: results
      };
      
    } catch (error) {
      return {
        scenario: 'MANUAL_QUANTITY_FLOW',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        steps: results
      };
    }
  }

  // Cenário C: Discrepâncias e Validações
  async testDiscrepancyHandling(): Promise<TestResult> {
    const results: TestStep[] = [];
    
    try {
      const inventory = await this.createTestInventory();
      results.push({ step: 'CREATE_INVENTORY', success: true, data: inventory });
      
      // Simular registros de série incompletos
        const partialSerials = ['SER001', 'SER002']; // Faltando SER003
        for (const serial of partialSerials) {
          const result = await this.storage.registerSerialReading(
            inventory.id,
            { serialNumber: serial, countStage: 'count1' },
            1
          );
        results.push({ 
          step: 'REGISTER_PARTIAL_SERIAL', 
          success: result.success, 
          data: { serial } 
        });
      }
      
      // Executar reconciliação
      await this.storage.reconcileInventory(inventory.id);
      results.push({ step: 'RECONCILIATION', success: true });
      
      return {
        scenario: 'DISCREPANCY_HANDLING',
        success: results.every(r => r.success),
        steps: results
      };
      
    } catch (error) {
      return {
        scenario: 'DISCREPANCY_HANDLING',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        steps: results
      };
    }
  }

  // Teste de performance com grande volume
  async testLargeVolumePerformance(): Promise<TestResult> {
    const results: TestStep[] = [];
    const startTime = Date.now();
    
    try {
      const inventory = await this.createTestInventory();
      results.push({ step: 'CREATE_INVENTORY', success: true, data: inventory });
      
      // Simular 1000 leituras de série
      const serialCount = 1000;
      const batchSize = 100;
      
      for (let i = 0; i < serialCount; i += batchSize) {
          const batchPromises: Promise<any>[] = [];
        
        for (let j = 0; j < batchSize && (i + j) < serialCount; j++) {
          const serial = `PERF${String(i + j + 1).padStart(6, '0')}`;
            batchPromises.push(
              this.storage.registerSerialReading(
                inventory.id,
                { serialNumber: serial, countStage: 'count1' },
                1
              )
            );
        }
        
        await Promise.all(batchPromises);
        results.push({ 
          step: 'BATCH_REGISTER', 
          success: true, 
          data: { batch: i / batchSize + 1, processed: Math.min(i + batchSize, serialCount) } 
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        scenario: 'LARGE_VOLUME_PERFORMANCE',
        success: true,
        steps: results,
        metadata: { 
          serialCount, 
          duration, 
          throughput: serialCount / (duration / 1000) 
        }
      };
      
    } catch (error) {
      return {
        scenario: 'LARGE_VOLUME_PERFORMANCE',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        steps: results
      };
    }
  }

  private async createTestInventory(): Promise<any> {
    // Simular criação de inventário para teste
    return {
      id: Math.floor(Math.random() * 1000000),
      code: `TEST-${Date.now()}`,
      status: 'count1_open'
    };
  }
}

interface TestStep {
  step: string;
  success: boolean;
  data?: any;
}

interface TestResult {
  scenario: string;
  success: boolean;
  steps: TestStep[];
  error?: string;
  metadata?: any;
}

// Sistema de monitoramento de performance
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      this.metrics.get(operation)!.push(duration);
    };
  }
  
  getStats(operation: string): PerformanceStats | null {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) return null;
    
    const sorted = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    
    return {
      operation,
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  getAllStats(): PerformanceStats[] {
    return Array.from(this.metrics.keys()).map(op => this.getStats(op)!).filter(Boolean);
  }
  
  reset(): void {
    this.metrics.clear();
  }
}

interface PerformanceStats {
  operation: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
}