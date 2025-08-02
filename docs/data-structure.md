# Estrutura de Dados do Projeto

Este documento descreve as principais estruturas de dados (interfaces TypeScript) utilizadas no projeto, conforme definido no arquivo <mcfile name="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts"></mcfile>.

## <mcsymbol name="User" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="3" type="class"></mcsymbol>
Representa um usuário do sistema.
```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="Category" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="15" type="class"></mcsymbol>
Representa uma categoria de produto.
```typescript
export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="Product" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="23" type="class"></mcsymbol>
Representa um produto no inventário.
```typescript
export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  categoryId?: number;
  costValue?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="Location" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="33" type="class"></mcsymbol>
Representa um local de armazenamento.
```typescript
export interface Location {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="Stock" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="41" type="class"></mcsymbol>
Representa o estoque de um produto em um local específico.
```typescript
export interface Stock {
  id: number;
  productId: number;
  locationId: number;
  quantity: number;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="InventoryType" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="49" type="class"></mcsymbol>
Representa um tipo de inventário.
```typescript
export interface InventoryType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}
```

## <mcsymbol name="InventoryStatus" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="56" type="class"></mcsymbol>
Define os possíveis status de um inventário.
```typescript
export type InventoryStatus =
  | "planning"        // Planejamento inicial
  | "open"           // Aberto para contagem
  | "count1_open"    // 1ª contagem aberta
  | "count1_closed"  // 1ª contagem fechada
  | "count2_open"    // 2ª contagem aberta
  | "count2_closed"  // 2ª contagem fechada
  | "count2_completed" // 2ª contagem concluída (C1=C2)
  | "count3_required" // 3ª contagem necessária (C1≠C2)
  | "count3_open"    // 3ª contagem aberta
  | "count3_closed"  // 3ª contagem fechada
  | "audit_mode"     // Modo auditoria (Mesa de Controle)
  | "closed"         // Fechado/Concluído
  | "cancelled";     // Cancelado
```

Os status adicionais controlam cada etapa das contagens e da auditoria:
- `count1_open`/`count1_closed`: abertura e fechamento da 1ª contagem.
- `count2_open`/`count2_closed`: abertura e fechamento da 2ª contagem.
- `count2_completed`: indica que a 2ª contagem foi concluída sem divergências.
- `count3_required`: sinaliza necessidade de uma 3ª contagem devido a divergências.
- `count3_open`/`count3_closed`: abertura e fechamento da 3ª contagem.
- `audit_mode`: inventário em auditoria pela mesa de controle.

## <mcsymbol name="Inventory" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="67" type="class"></mcsymbol>
Representa um inventário.
```typescript
export interface Inventory {
  id: number;
  code: string;
  typeId: number;
  status: InventoryStatus;
  startDate: number;
  endDate?: number;
  predictedEndDate?: number;
  description?: string;
  selectedLocationIds?: number[];  // JSON array of selected location IDs
  selectedCategoryIds?: number[];  // JSON array of selected category IDs
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="InventoryItem" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="82" type="class"></mcsymbol>
Representa um item específico dentro de um inventário.
```typescript
export interface InventoryItem {
  id: number;
  inventoryId: number;
  productId: number;
  locationId: number;
  expectedQuantity: number;
  finalQuantity?: number;
  status: string;
  // Multiple count fields
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  difference?: number;
  accuracy?: number;
  // Count audit fields
  count1By?: string;
  count2By?: string;
  count3By?: string;
  count4By?: string;
  count1At?: number;
  count2At?: number;
  count3At?: number;
  count4At?: number;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="Count" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="108" type="class"></mcsymbol>
Representa uma contagem específica para um item de inventário.
```typescript
export interface Count {
  id: number;
  inventoryItemId: number;
  countNumber: number;
  quantity: number;
  countedBy: string;
  countedAt: number;
  notes?: string;
}
```

## <mcsymbol name="AuditLog" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="118" type="class"></mcsymbol>
Representa um registro de auditoria.
```typescript
export interface AuditLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string;
  newValues?: string;
  metadata?: string;
  timestamp: number;
}
```

## <mcsymbol name="InventoryStockItem" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="130" type="class"></mcsymbol>
Nova interface para controle de itens de estoque no inventário.
```typescript
export interface InventoryStockItem {
  id: number;
  inventoryId: number;
  stockItemId: number;
  expectedQuantity: number;
  finalQuantity?: number;
  status: string;
  // Multiple count fields
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  difference?: number;
  accuracy?: number;
  // Count audit fields
  count1By?: string;
  count2By?: string;
  count3By?: string;
  count4By?: string;
  count1At?: number;
  count2At?: number;
  count3At?: number;
  count4At?: number;
  createdAt: number;
  updatedAt: number;
}
```

## <mcsymbol name="ControlPanelStats" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="154" type="class"></mcsymbol>
Interface para estatísticas do painel de controle.
```typescript
export interface ControlPanelStats {
  totalInventories: number;
  activeInventories: number;
  itemsInProgress: number;
  itemsCompleted: number;
  accuracyRate: number;
  divergenceCount: number;
  countingProgress: {
    count1: number;
    count2: number;
    count3: number;
    audit: number;
  };
}
```

## <mcsymbol name="InventorySerialItem" filename="schema.ts" path="c:\Projetos\Locador\locador-inventory\shared\schema.ts" startline="168" type="class"></mcsymbol>
Controle de Patrimônio - Número de Série.
```typescript
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
}
```