
# Prompt 2: Alterações no Backend

## Objetivo
Implementar as APIs e lógica de negócio necessárias para suportar o novo processo de inventário com múltiplas contagens e controle detalhado.

## Contexto
Com o banco de dados atualizado, agora precisamos implementar a lógica de negócio que suporte:
- Criação de inventário com seleção de locais/categorias
- Gerenciamento de status e transições
- APIs para contagens individuais
- Mesa de Controle com estatísticas
- Controle de patrimônio

## Tarefas Específicas

### 1. Atualizar Storage Layer (server/sqlserver-storage.ts)
- Método `createInventory` com seleção de locais/categorias
- Método `getInventoryStats` para Mesa de Controle
- Métodos para atualizar contagens individuais:
  - `updateCount1`, `updateCount2`, `updateCount3`, `updateCount4`
- Método `calculateAccuracy` e `calculateDifference`
- Métodos para `inventory_stock_items`
- Método `transitionInventoryStatus`

### 2. Atualizar Routes (server/routes.ts)
- **POST** `/api/inventories` - Criar com locais/categorias
- **PUT** `/api/inventories/:id/status` - Transição de status
- **GET** `/api/inventories/:id/stats` - Estatísticas para Mesa de Controle
- **PUT** `/api/inventory-items/:id/count1` - Registrar 1ª contagem
- **PUT** `/api/inventory-items/:id/count2` - Registrar 2ª contagem  
- **PUT** `/api/inventory-items/:id/count3` - Registrar 3ª contagem
- **PUT** `/api/inventory-items/:id/count4` - Registrar contagem de auditoria
- **GET** `/api/inventories/:id/stock-items` - Itens de patrimônio
- **PUT** `/api/inventory-stock-items/:id/count` - Contagem de patrimônio

### 3. Implementar Lógica de Negócio
- Validação de transições de status
- Cálculo automático de diferenças e acuracidade
- Regras para contagens obrigatórias vs opcionais
- Auditoria detalhada de todas as operações
- Congelamento de dados no momento da criação

### 4. Adicionar Middlewares
- Validação de permissões por status
- Log de auditoria automático
- Validação de dados de contagem

Execute este prompt após completar as alterações do banco de dados.
