
# Prompt 1: Database Schema - Controle de Patrimônio no Inventário

## Objetivo
Implementar as alterações necessárias no schema do banco de dados para suportar o controle de patrimônio por número de série durante o processo de inventário.

## Alterações Necessárias

### 1. Nova Tabela: inventory_serial_items
```sql
CREATE TABLE inventory_serial_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    inventoryId INT NOT NULL,
    stockItemId INT NOT NULL,
    serialNumber NVARCHAR(255) NOT NULL,
    productId INT NOT NULL,
    locationId INT NOT NULL,
    expectedStatus BIT DEFAULT 1, -- 1=deveria existir, 0=não deveria
    
    -- Contagens por estágio
    count1_found BIT NULL,
    count2_found BIT NULL, 
    count3_found BIT NULL,
    count4_found BIT NULL,
    
    -- Auditoria de contagens
    count1_by NVARCHAR(255) NULL,
    count2_by NVARCHAR(255) NULL,
    count3_by NVARCHAR(255) NULL,
    count4_by NVARCHAR(255) NULL,
    count1_at DATETIME2 NULL,
    count2_at DATETIME2 NULL,
    count3_at DATETIME2 NULL,
    count4_at DATETIME2 NULL,
    
    -- Status e observações
    status NVARCHAR(50) DEFAULT 'PENDING', -- PENDING, FOUND, MISSING, EXTRA
    notes NVARCHAR(1000) NULL,
    finalStatus BIT NULL, -- Status final após todas as contagens
    
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (inventoryId) REFERENCES inventories(id) ON DELETE CASCADE,
    FOREIGN KEY (stockItemId) REFERENCES stock_items(id),
    FOREIGN KEY (productId) REFERENCES products(id),
    FOREIGN KEY (locationId) REFERENCES locations(id),
    FOREIGN KEY (count1_by) REFERENCES users(id),
    FOREIGN KEY (count2_by) REFERENCES users(id),
    FOREIGN KEY (count3_by) REFERENCES users(id),
    FOREIGN KEY (count4_by) REFERENCES users(id)
);
```

### 2. Alteração na Tabela products
```sql
-- Adicionar flag para identificar produtos com controle de série
ALTER TABLE products ADD hasSerialControl BIT DEFAULT 0;
```

### 3. Alteração na Tabela inventory_items
```sql
-- Adicionar campos para relacionar com contagem de séries
ALTER TABLE inventory_items ADD serialItemsCount INT DEFAULT 0;
ALTER TABLE inventory_items ADD serialItemsFound INT DEFAULT 0;
ALTER TABLE inventory_items ADD serialItemsMissing INT DEFAULT 0;
ALTER TABLE inventory_items ADD hasSerialDiscrepancy BIT DEFAULT 0;
```

### 4. Índices para Performance
```sql
CREATE INDEX IX_inventory_serial_items_inventory_product 
ON inventory_serial_items (inventoryId, productId);

CREATE INDEX IX_inventory_serial_items_serial_number 
ON inventory_serial_items (serialNumber);

CREATE INDEX IX_inventory_serial_items_status 
ON inventory_serial_items (inventoryId, status);

CREATE INDEX IX_products_serial_control 
ON products (hasSerialControl) WHERE hasSerialControl = 1;
```

### 5. Views para Relatórios
```sql
-- View para reconciliação de quantidades vs séries
CREATE VIEW vw_inventory_reconciliation AS
SELECT 
    ii.inventoryId,
    ii.productId,
    ii.locationId,
    p.name as productName,
    p.sku,
    l.name as locationName,
    ii.expectedQuantity,
    ii.finalQuantity,
    ii.serialItemsCount,
    ii.serialItemsFound,
    ii.serialItemsMissing,
    CASE 
        WHEN p.hasSerialControl = 1 AND ii.finalQuantity != ii.serialItemsFound 
        THEN 1 ELSE 0 
    END as hasDiscrepancy
FROM inventory_items ii
JOIN products p ON ii.productId = p.id
JOIN locations l ON ii.locationId = l.id;
```

### 6. Stored Procedures
```sql
-- Procedure para criar itens de série ao iniciar inventário
CREATE PROCEDURE sp_CreateInventorySerialItems
    @InventoryId INT
AS
BEGIN
    INSERT INTO inventory_serial_items (
        inventoryId, stockItemId, serialNumber, productId, locationId, expectedStatus
    )
    SELECT 
        @InventoryId,
        si.id,
        si.serialNumber,
        si.productId,
        si.locationId,
        1
    FROM stock_items si
    JOIN products p ON si.productId = p.id
    WHERE p.hasSerialControl = 1 
    AND si.isActive = 1;
END;

-- Procedure para registrar leitura de série
CREATE PROCEDURE sp_RegisterSerialReading
    @InventoryId INT,
    @SerialNumber NVARCHAR(255),
    @CountStage NVARCHAR(10),
    @UserId NVARCHAR(255)
AS
BEGIN
    UPDATE inventory_serial_items 
    SET 
        count1_found = CASE WHEN @CountStage = 'count1' THEN 1 ELSE count1_found END,
        count2_found = CASE WHEN @CountStage = 'count2' THEN 1 ELSE count2_found END,
        count3_found = CASE WHEN @CountStage = 'count3' THEN 1 ELSE count3_found END,
        count4_found = CASE WHEN @CountStage = 'count4' THEN 1 ELSE count4_found END,
        count1_by = CASE WHEN @CountStage = 'count1' THEN @UserId ELSE count1_by END,
        count2_by = CASE WHEN @CountStage = 'count2' THEN @UserId ELSE count2_by END,
        count3_by = CASE WHEN @CountStage = 'count3' THEN @UserId ELSE count3_by END,
        count4_by = CASE WHEN @CountStage = 'count4' THEN @UserId ELSE count4_by END,
        count1_at = CASE WHEN @CountStage = 'count1' THEN GETDATE() ELSE count1_at END,
        count2_at = CASE WHEN @CountStage = 'count2' THEN GETDATE() ELSE count2_at END,
        count3_at = CASE WHEN @CountStage = 'count3' THEN GETDATE() ELSE count3_at END,
        count4_at = CASE WHEN @CountStage = 'count4' THEN GETDATE() ELSE count4_at END,
        status = 'FOUND',
        updatedAt = GETDATE()
    WHERE inventoryId = @InventoryId 
    AND serialNumber = @SerialNumber;
END;
```

## Tarefas de Implementação

1. **Executar Scripts SQL**: Criar tabelas e índices
2. **Atualizar Stored Procedures**: Modificar procedures existentes
3. **Migração de Dados**: Marcar produtos com controle de série
4. **Testes de Integridade**: Validar relacionamentos
5. **Performance Testing**: Verificar índices

## Validações Necessárias

- [ ] Verificar se todos os produtos com stock_items têm hasSerialControl = 1
- [ ] Validar integridade referencial
- [ ] Testar procedures com dados de exemplo
- [ ] Verificar performance de consultas
- [ ] Validar cascata de exclusões

## Considerações de Segurança

- Backup completo antes da implementação
- Rollback plan definido
- Testes em ambiente de desenvolvimento primeiro
- Validação de permissões de usuário

## Próximo Prompt
Após implementação do schema: **Backend APIs - Controle de Patrimônio**
