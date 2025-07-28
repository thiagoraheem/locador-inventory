
# Prompt 2: Backend APIs - Controle de Patrimônio no Inventário

## Objetivo
Implementar as APIs necessárias no backend para suportar o controle de patrimônio por número de série durante o processo de inventário.

## Novas Interfaces TypeScript

### 1. Atualizar schema.ts
```typescript
// Adicionar aos tipos existentes
export interface InventorySerialItem {
  id: number;
  inventoryId: number;
  stockItemId: number;
  serialNumber: string;
  productId: number;
  locationId: number;
  expectedStatus: boolean;
  
  // Contagens por estágio
  count1_found?: boolean;
  count2_found?: boolean;
  count3_found?: boolean;
  count4_found?: boolean;
  
  // Auditoria
  count1_by?: string;
  count2_by?: string;
  count3_by?: string;
  count4_by?: string;
  count1_at?: number;
  count2_at?: number;
  count3_at?: number;
  count4_at?: number;
  
  status: 'PENDING' | 'FOUND' | 'MISSING' | 'EXTRA';
  notes?: string;
  finalStatus?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProductWithSerialControl extends Product {
  hasSerialControl: boolean;
  serialItemsCount?: number;
}

export interface InventoryItemWithSerial extends InventoryItem {
  serialItemsCount: number;
  serialItemsFound: number;
  serialItemsMissing: number;
  hasSerialDiscrepancy: boolean;
}

export interface SerialReadingRequest {
  serialNumber: string;
  countStage: 'count1' | 'count2' | 'count3' | 'count4';
}

export interface SerialReadingResponse {
  success: boolean;
  productId?: number;
  productName?: string;
  alreadyRead?: boolean;
  newSerial?: boolean;
}
```

### 2. Métodos no Storage (sqlserver-storage.ts)

```typescript
// Adicionar aos métodos existentes
export interface StorageInterface {
  // ... métodos existentes ...
  
  // Controle de patrimônio
  createInventorySerialItems(inventoryId: number): Promise<void>;
  getInventorySerialItems(inventoryId: number): Promise<InventorySerialItem[]>;
  getInventorySerialItemsByProduct(inventoryId: number, productId: number): Promise<InventorySerialItem[]>;
  registerSerialReading(inventoryId: number, request: SerialReadingRequest, userId: string): Promise<SerialReadingResponse>;
  updateInventorySerialItem(id: number, data: Partial<InventorySerialItem>): Promise<InventorySerialItem>;
  
  // Busca e validação
  findProductBySerial(serialNumber: string): Promise<Product | null>;
  validateSerialExists(serialNumber: string): Promise<boolean>;
  getSerialHistory(serialNumber: string): Promise<InventorySerialItem[]>;
  
  // Reconciliação
  reconcileInventoryQuantities(inventoryId: number): Promise<void>;
  getInventoryReconciliation(inventoryId: number): Promise<any[]>;
  
  // Produtos com controle de série
  getProductsWithSerialControl(): Promise<ProductWithSerialControl[]>;
  updateProductSerialControl(productId: number, hasSerialControl: boolean): Promise<void>;
}
```

## Implementação dos Métodos

### 1. Controle de Patrimônio

```typescript
async createInventorySerialItems(inventoryId: number): Promise<void> {
  const query = `
    EXEC sp_CreateInventorySerialItems @InventoryId = @inventoryId
  `;
  
  await this.pool.request()
    .input('inventoryId', sql.Int, inventoryId)
    .query(query);
}

async registerSerialReading(
  inventoryId: number, 
  request: SerialReadingRequest, 
  userId: string
): Promise<SerialReadingResponse> {
  // Verificar se série existe
  const product = await this.findProductBySerial(request.serialNumber);
  if (!product) {
    return { success: false, newSerial: true };
  }
  
  // Verificar se já foi lida neste estágio
  const existingReading = await this.pool.request()
    .input('inventoryId', sql.Int, inventoryId)
    .input('serialNumber', sql.NVarChar, request.serialNumber)
    .input('countStage', sql.NVarChar, request.countStage)
    .query(`
      SELECT * FROM inventory_serial_items 
      WHERE inventoryId = @inventoryId 
      AND serialNumber = @serialNumber
      AND ${request.countStage}_found = 1
    `);
    
  if (existingReading.recordset.length > 0) {
    return { 
      success: false, 
      alreadyRead: true, 
      productId: product.id,
      productName: product.name 
    };
  }
  
  // Registrar leitura
  await this.pool.request()
    .input('inventoryId', sql.Int, inventoryId)
    .input('serialNumber', sql.NVarChar, request.serialNumber)
    .input('countStage', sql.NVarChar, request.countStage)
    .input('userId', sql.NVarChar, userId)
    .query('EXEC sp_RegisterSerialReading @InventoryId, @SerialNumber, @CountStage, @UserId');
  
  // Atualizar contagem do produto
  await this.updateProductQuantityFromSerial(inventoryId, product.id, request.countStage);
  
  return { 
    success: true, 
    productId: product.id, 
    productName: product.name 
  };
}

async findProductBySerial(serialNumber: string): Promise<Product | null> {
  const result = await this.pool.request()
    .input('serialNumber', sql.NVarChar, serialNumber)
    .query(`
      SELECT p.* FROM products p
      JOIN stock_items si ON p.id = si.productId
      WHERE si.serialNumber = @serialNumber
      AND si.isActive = 1
    `);
    
  return result.recordset[0] || null;
}
```

### 2. Reconciliação

```typescript
async reconcileInventoryQuantities(inventoryId: number): Promise<void> {
  const query = `
    UPDATE ii 
    SET 
      serialItemsFound = (
        SELECT COUNT(*) FROM inventory_serial_items isi 
        WHERE isi.inventoryId = ii.inventoryId 
        AND isi.productId = ii.productId 
        AND isi.locationId = ii.locationId
        AND isi.status = 'FOUND'
      ),
      serialItemsMissing = (
        SELECT COUNT(*) FROM inventory_serial_items isi 
        WHERE isi.inventoryId = ii.inventoryId 
        AND isi.productId = ii.productId 
        AND isi.locationId = ii.locationId
        AND isi.status = 'MISSING'
      ),
      hasSerialDiscrepancy = (
        CASE WHEN p.hasSerialControl = 1 
        AND ii.finalQuantity != (
          SELECT COUNT(*) FROM inventory_serial_items isi 
          WHERE isi.inventoryId = ii.inventoryId 
          AND isi.productId = ii.productId 
          AND isi.locationId = ii.locationId
          AND isi.status = 'FOUND'
        ) THEN 1 ELSE 0 END
      )
    FROM inventory_items ii
    JOIN products p ON ii.productId = p.id
    WHERE ii.inventoryId = @inventoryId
  `;
  
  await this.pool.request()
    .input('inventoryId', sql.Int, inventoryId)
    .query(query);
}
```

## Novas Rotas da API

### 1. Rotas para Controle de Série

```typescript
// Inicializar itens de série para inventário
app.post("/api/inventories/:id/serial-items/initialize", isAuthenticated, async (req: any, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    storage = await getStorage();
    await storage.createInventorySerialItems(inventoryId);
    res.json({ message: "Serial items initialized successfully" });
  } catch (error) {
    console.error("Error initializing serial items:", error);
    res.status(500).json({ message: "Failed to initialize serial items" });
  }
});

// Registrar leitura de número de série
app.post("/api/inventories/:id/serial-reading", isAuthenticated, async (req: any, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const { serialNumber, countStage } = req.body;
    
    storage = await getStorage();
    const result = await storage.registerSerialReading(
      inventoryId, 
      { serialNumber, countStage }, 
      req.user.id
    );
    
    if (result.success) {
      await storage.createAuditLog({
        userId: req.user.id,
        action: "SERIAL_READING",
        entityType: "inventory_serial_item",
        entityId: `${inventoryId}-${serialNumber}`,
        newValues: JSON.stringify({ serialNumber, countStage }),
        metadata: JSON.stringify({ productId: result.productId }),
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error registering serial reading:", error);
    res.status(500).json({ message: "Failed to register serial reading" });
  }
});

// Buscar produto por número de série
app.get("/api/products/by-serial/:serial", isAuthenticated, async (req: any, res) => {
  try {
    const serialNumber = req.params.serial;
    storage = await getStorage();
    const product = await storage.findProductBySerial(serialNumber);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found for this serial number" });
    }
    
    res.json(product);
  } catch (error) {
    console.error("Error finding product by serial:", error);
    res.status(500).json({ message: "Failed to find product" });
  }
});

// Listar itens de série do inventário
app.get("/api/inventories/:id/serial-items", isAuthenticated, async (req: any, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    storage = await getStorage();
    const items = await storage.getInventorySerialItems(inventoryId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory serial items:", error);
    res.status(500).json({ message: "Failed to fetch serial items" });
  }
});

// Reconciliação de quantidades
app.post("/api/inventories/:id/reconcile", isAuthenticated, async (req: any, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    storage = await getStorage();
    await storage.reconcileInventoryQuantities(inventoryId);
    
    const reconciliation = await storage.getInventoryReconciliation(inventoryId);
    
    await storage.createAuditLog({
      userId: req.user.id,
      action: "INVENTORY_RECONCILIATION",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      metadata: JSON.stringify({ itemsReconciled: reconciliation.length }),
    });
    
    res.json({ message: "Reconciliation completed", data: reconciliation });
  } catch (error) {
    console.error("Error reconciling inventory:", error);
    res.status(500).json({ message: "Failed to reconcile inventory" });
  }
});
```

### 2. Rotas para Produtos com Série

```typescript
// Atualizar controle de série do produto
app.put("/api/products/:id/serial-control", isAuthenticated, async (req: any, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { hasSerialControl } = req.body;
    
    storage = await getStorage();
    await storage.updateProductSerialControl(productId, hasSerialControl);
    
    await storage.createAuditLog({
      userId: req.user.id,
      action: "UPDATE_SERIAL_CONTROL",
      entityType: "product",
      entityId: productId.toString(),
      newValues: JSON.stringify({ hasSerialControl }),
    });
    
    res.json({ message: "Serial control updated successfully" });
  } catch (error) {
    console.error("Error updating serial control:", error);
    res.status(500).json({ message: "Failed to update serial control" });
  }
});

// Listar produtos com controle de série
app.get("/api/products/with-serial-control", isAuthenticated, async (req: any, res) => {
  try {
    storage = await getStorage();
    const products = await storage.getProductsWithSerialControl();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products with serial control:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});
```

## Tarefas de Implementação

1. **Atualizar Interfaces**: Modificar schema.ts
2. **Implementar Storage Methods**: Adicionar métodos no sqlserver-storage.ts
3. **Criar Rotas API**: Adicionar endpoints no routes.ts
4. **Implementar Validações**: Verificações de integridade
5. **Testes Unitários**: Validar cada método
6. **Documentação API**: Documentar novos endpoints

## Validações Necessárias

- [ ] Verificar se número de série existe antes de registrar
- [ ] Prevenir dupla leitura no mesmo estágio
- [ ] Validar permissões de usuário
- [ ] Logs de auditoria completos
- [ ] Tratamento de erros robusto

## Próximo Prompt
Após implementação das APIs: **Frontend Mobile - Interface Dual**
