# Estrutura de Dados do Sistema de Inventário

Este documento descreve a estrutura de dados utilizada no sistema de inventário, incluindo todas as tabelas, seus relacionamentos e propósito.

## Tabelas Principais

### Users (Usuários)
Tabela de usuários do sistema, integrada com Replit Auth.
```sql
users {
  id: varchar (PK)
  email: varchar (UNIQUE)
  firstName: varchar
  lastName: varchar
  profileImageUrl: varchar
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Categories (Categorias)
Categorias para classificação dos produtos.
```sql
categories {
  id: serial (PK)
  name: varchar(255) (UNIQUE)
  description: text
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Products (Produtos)
Produtos cadastrados no sistema.
```sql
products {
  id: serial (PK)
  sku: varchar(100) (UNIQUE)
  name: varchar(255)
  description: text
  categoryId: integer (FK -> categories.id)
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Locations (Locais)
Locais de armazenamento dos produtos.
```sql
locations {
  id: serial (PK)
  code: varchar(50) (UNIQUE)
  name: varchar(255)
  description: text
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Stock (Estoque)
Associação entre produtos e locais, com quantidade em estoque.
```sql
stock {
  id: serial (PK)
  productId: integer (FK -> products.id)
  locationId: integer (FK -> locations.id)
  quantity: decimal(10,2)
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Sistema de Inventário

### InventoryTypes (Tipos de Inventário)
Tipos de inventário que podem ser realizados.
```sql
inventoryTypes {
  id: serial (PK)
  name: varchar(100) (UNIQUE)
  description: text
  isActive: boolean
}
```

### Inventories (Inventários)
Registros de inventários realizados.
```sql
inventories {
  id: serial (PK)
  code: varchar(100) (UNIQUE)
  typeId: integer (FK -> inventoryTypes.id)
  status: varchar(50) [OPEN, COUNTING, CLOSED]
  startDate: timestamp
  endDate: timestamp
  description: text
  createdBy: varchar (FK -> users.id)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### InventoryItems (Itens do Inventário)
Itens a serem contados em cada inventário.
```sql
inventoryItems {
  id: serial (PK)
  inventoryId: integer (FK -> inventories.id)
  productId: integer (FK -> products.id)
  locationId: integer (FK -> locations.id)
  expectedQuantity: decimal(10,2)
  finalQuantity: decimal(10,2)
  status: varchar(50) [PENDING, COUNTING, COMPLETED]
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Counts (Contagens)
Registros de contagens realizadas para cada item do inventário.
```sql
counts {
  id: serial (PK)
  inventoryItemId: integer (FK -> inventoryItems.id)
  countNumber: integer
  quantity: decimal(10,2)
  countedBy: varchar (FK -> users.id)
  countedAt: timestamp
  notes: text
}
```

## Sistema de Auditoria

### AuditLogs (Logs de Auditoria)
Registros de todas as alterações realizadas no sistema.
```sql
auditLogs {
  id: serial (PK)
  userId: varchar (FK -> users.id)
  action: varchar(100)
  entityType: varchar(100)
  entityId: varchar(100)
  oldValues: jsonb
  newValues: jsonb
  metadata: jsonb
  timestamp: timestamp
}
```

## Relacionamentos

1. **Products -> Categories**: Muitos-para-Um
   - Cada produto pertence a uma categoria
   - Uma categoria pode ter vários produtos

2. **Stock -> Products/Locations**: Muitos-para-Um
   - Cada registro de estoque associa um produto a um local
   - Um produto pode estar em vários locais
   - Um local pode ter vários produtos

3. **Inventories -> InventoryTypes**: Muitos-para-Um
   - Cada inventário tem um tipo
   - Um tipo pode ter vários inventários

4. **Inventories -> Users**: Muitos-para-Um
   - Cada inventário é criado por um usuário
   - Um usuário pode criar vários inventários

5. **InventoryItems -> Inventories**: Muitos-para-Um
   - Cada item pertence a um inventário
   - Um inventário pode ter vários itens

6. **InventoryItems -> Products/Locations**: Muitos-para-Um
   - Cada item do inventário referencia um produto e um local
   - Um produto/local pode estar em vários itens de inventário

7. **Counts -> InventoryItems**: Muitos-para-Um
   - Cada contagem pertence a um item do inventário
   - Um item pode ter várias contagens (até 3)

8. **Counts -> Users**: Muitos-para-Um
   - Cada contagem é realizada por um usuário
   - Um usuário pode realizar várias contagens

9. **AuditLogs -> Users**: Muitos-para-Um
   - Cada log de auditoria está associado a um usuário
   - Um usuário pode ter vários logs de auditoria

## Observações

1. Todas as tabelas principais possuem campos de controle temporal (`createdAt` e `updatedAt`)
2. As entidades principais (Products, Categories, Locations) possuem flag `isActive` para soft delete
3. O sistema utiliza Drizzle ORM com PostgreSQL como banco de dados
4. Implementa auditoria completa de mudanças através da tabela `auditLogs`
5. O código do inventário (inventory.code) é gerado automaticamente no formato: `INV-YYYYMM-NNN`
