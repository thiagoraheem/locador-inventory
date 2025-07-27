
# Prompt 1: Alterações no Banco de Dados

## Objetivo
Implementar as alterações necessárias no schema do banco de dados para suportar o novo processo de inventário com múltiplas contagens, auditoria e controle de patrimônio.

## Contexto
O sistema atual possui uma estrutura básica de inventário. Precisamos expandir para suportar:
- Status detalhados do inventário (Aberto, 1ª contagem, 2ª contagem, 3ª contagem, Auditoria, Divergência, Fechado)
- Múltiplas contagens por item (C1, C2, C3, C4)
- Campos de acuracidade e diferença
- Controle de patrimônio (stock_items)
- Seleção de locais e categorias no inventário

## Tarefas Específicas

### 1. Atualizar Schema Types (shared/schema.ts)
- Adicionar novos status de inventário
- Incluir campos de seleção de locais e categorias
- Expandir InventoryItem com campos de contagem individual
- Adicionar interface para InventoryStockItem (patrimônio)
- Criar tipos para estatísticas da Mesa de Controle

### 2. Atualizar Tabelas SQL (server/setup-sqlserver.ts)
- Modificar tabela `inventories` para incluir:
  - `selectedLocationIds` (JSON)
  - `selectedCategoryIds` (JSON)
  - `predictedEndDate`
- Modificar tabela `inventory_items` para incluir:
  - `count1`, `count2`, `count3`, `count4` (REAL)
  - `difference` (REAL)
  - `accuracy` (REAL)
  - `count1By`, `count2By`, `count3By`, `count4By` (NVARCHAR)
  - `count1At`, `count2At`, `count3At`, `count4At` (DATETIME2)
- Criar tabela `inventory_stock_items`:
  - `id`, `inventoryId`, `stockItemId`
  - `expectedQuantity`, `count1`, `count2`, `count3`, `count4`
  - `finalQuantity`, `difference`, `accuracy`
  - Campos de auditoria (contadores e datas)

### 3. Adicionar Validações Zod
- Esquemas para novos campos
- Validação de status transitions
- Validação de contagens

Execute este prompt primeiro antes de prosseguir para o backend.
