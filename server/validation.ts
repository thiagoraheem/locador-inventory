import { SimpleStorage } from './simple-storage';

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

export class InventoryIntegrityValidator {
  constructor(private storage: SimpleStorage) {}

  async validateInventoryIntegrity(inventoryId: number): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    try {
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
    } catch (error) {
      // Erro na validação de integridade
      throw error;
    }
  }

  async generateReconciliationReport(inventoryId: number): Promise<ReconciliationReport> {
    try {
      const summary = await this.calculateSummary(inventoryId);
      const productDetails = await this.getProductReconciliationDetails(inventoryId);
      const discrepancies = await this.findSerialDiscrepancies(inventoryId);
      const recommendations = this.generateRecommendations(summary, discrepancies);

      return {
        inventoryId,
        summary,
        productDetails,
        serialDiscrepancies: discrepancies,
        recommendations
      };
    } catch (error) {
      // Erro na geração do relatório de reconciliação
      throw error;
    }
  }

  private async getProductsWithSerialControl(inventoryId: number): Promise<any[]> {
    const query = `
      SELECT DISTINCT p.id, p.name, p.sku
      FROM products p
      INNER JOIN inventory_items ii ON p.id = ii.productId
      WHERE ii.inventoryId = @inventoryId 
      AND p.hasSerialControl = 1
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
    
    return result.recordset;
  }

  private async getExpectedSerials(inventoryId: number, productId: number): Promise<string[]> {
    const query = `
      SELECT serialNumber
      FROM stock_items si
      INNER JOIN products p ON si.productId = p.id
      WHERE p.id = @productId
      AND si.isActive = 1
    `;
    
    const result = await this.storage.pool.request()
      .input('productId', productId)
      .query(query);
    
    return result.recordset.map(r => r.serialNumber);
  }

  private async getFoundSerials(inventoryId: number, productId: number): Promise<string[]> {
    const query = `
      SELECT serialNumber
      FROM inventory_serial_items
      WHERE inventoryId = @inventoryId
      AND productId = @productId
      AND (count1_found = 1 OR count2_found = 1 OR count3_found = 1 OR count4_found = 1)
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .input('productId', productId)
      .query(query);
    
    return result.recordset.map(r => r.serialNumber);
  }

  private async findDuplicateSerials(inventoryId: number): Promise<any[]> {
    const query = `
      SELECT serialNumber, COUNT(*) as count
      FROM inventory_serial_items
      WHERE inventoryId = @inventoryId
      GROUP BY serialNumber
      HAVING COUNT(*) > 1
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
    
    return result.recordset;
  }

  private async findQuantityMismatches(inventoryId: number): Promise<any[]> {
    const query = `
      SELECT 
        ii.productId,
        ii.count1 as manualQuantity,
        COUNT(isi.id) as serialQuantity
      FROM inventory_items ii
      LEFT JOIN inventory_serial_items isi ON ii.inventoryId = isi.inventoryId 
        AND ii.productId = isi.productId
        AND isi.count1_found = 1
      INNER JOIN products p ON ii.productId = p.id
      WHERE ii.inventoryId = @inventoryId
      AND p.hasSerialControl = 1
      AND ii.count1 IS NOT NULL
      GROUP BY ii.productId, ii.count1
      HAVING ii.count1 != COUNT(isi.id)
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
    
    return result.recordset;
  }

  private async calculateSummary(inventoryId: number): Promise<ReconciliationSummary> {
    const queries = {
      totalProducts: `
        SELECT COUNT(DISTINCT productId) as count
        FROM inventory_items
        WHERE inventoryId = @inventoryId
      `,
      productsWithSerial: `
        SELECT COUNT(DISTINCT ii.productId) as count
        FROM inventory_items ii
        INNER JOIN products p ON ii.productId = p.id
        WHERE ii.inventoryId = @inventoryId
        AND p.hasSerialControl = 1
      `,
      serialItemsExpected: `
        SELECT COUNT(*) as count
        FROM inventory_serial_items
        WHERE inventoryId = @inventoryId
        AND expectedStatus = 1
      `,
      serialItemsFound: `
        SELECT COUNT(*) as count
        FROM inventory_serial_items
        WHERE inventoryId = @inventoryId
        AND (count1_found = 1 OR count2_found = 1 OR count3_found = 1 OR count4_found = 1)
      `,
      productsWithDiscrepancy: `
        SELECT COUNT(DISTINCT productId) as count
        FROM inventory_items
        WHERE inventoryId = @inventoryId
        AND hasSerialDiscrepancy = 1
      `
    };

    const results: any = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await this.storage.pool.request()
        .input('inventoryId', inventoryId)
        .query(query);
      
      results[key] = result.recordset[0]?.count || 0;
    }

    return {
      totalProducts: results.totalProducts,
      productsWithSerial: results.productsWithSerial,
      productsManual: results.totalProducts - results.productsWithSerial,
      serialItemsExpected: results.serialItemsExpected,
      serialItemsFound: results.serialItemsFound,
      serialItemsMissing: results.serialItemsExpected - results.serialItemsFound,
      productsWithDiscrepancy: results.productsWithDiscrepancy
    };
  }

  private async getProductReconciliationDetails(inventoryId: number): Promise<any[]> {
    const query = `
      SELECT 
        p.id as productId,
        p.name as productName,
        p.sku,
        ii.expectedQuantity,
        ii.count1,
        ii.count2,
        ii.count3,
        ii.hasSerialDiscrepancy,
        COUNT(isi.id) as serialItemsCount
      FROM inventory_items ii
      INNER JOIN products p ON ii.productId = p.id
      LEFT JOIN inventory_serial_items isi ON ii.inventoryId = isi.inventoryId 
        AND ii.productId = isi.productId
      WHERE ii.inventoryId = @inventoryId
      GROUP BY p.id, p.name, p.sku, ii.expectedQuantity, ii.count1, ii.count2, ii.count3, ii.hasSerialDiscrepancy
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
    
    return result.recordset;
  }

  private async findSerialDiscrepancies(inventoryId: number): Promise<any[]> {
    const query = `
      SELECT 
        p.name as productName,
        'SERIAL_MISSING' as type,
        COUNT(isi.id) as expected,
        SUM(CASE WHEN isi.count1_found = 1 THEN 1 ELSE 0 END) as found
      FROM inventory_serial_items isi
      INNER JOIN products p ON isi.productId = p.id
      WHERE isi.inventoryId = @inventoryId
      AND isi.expectedStatus = 1
      GROUP BY p.name
      HAVING COUNT(isi.id) != SUM(CASE WHEN isi.count1_found = 1 THEN 1 ELSE 0 END)
    `;
    
    const result = await this.storage.pool.request()
      .input('inventoryId', inventoryId)
      .query(query);
    
    return result.recordset;
  }

  private generateRecommendations(summary: ReconciliationSummary, discrepancies: any[]): string[] {
    const recommendations: string[] = [];

    if (summary.serialItemsMissing > 0) {
      recommendations.push(`Verificar ${summary.serialItemsMissing} séries não encontradas`);
    }

    if (summary.productsWithDiscrepancy > 0) {
      recommendations.push(`Investigar discrepâncias em ${summary.productsWithDiscrepancy} produtos`);
    }

    if (discrepancies.length > 0) {
      recommendations.push('Executar nova contagem para produtos com discrepâncias');
    }

    if (summary.serialItemsFound === summary.serialItemsExpected && summary.productsWithDiscrepancy === 0) {
      recommendations.push('Inventário está íntegro e pode ser finalizado');
    }

    return recommendations;
  }
}

export class InventoryLogger {
  logSerialReading(data: {
    inventoryId: number;
    serialNumber: string;
    userId: number;
    countStage: string;
    success: boolean;
    productId?: number;
  }) {
    // Serial reading logged
  }

  logDiscrepancy(data: {
    inventoryId: number;
    productId: number;
    type: string;
    expected: number;
    found: number;
  }) {
    // Discrepancy detected logged
  }

  logValidation(data: {
    inventoryId: number;
    isValid: boolean;
    issuesCount: number;
    userId: string;
  }) {
    // Inventory validation logged
  }

  logReconciliation(data: {
    inventoryId: number;
    summary: ReconciliationSummary;
    userId: string;
  }) {
    // Inventory reconciliation logged
  }
}