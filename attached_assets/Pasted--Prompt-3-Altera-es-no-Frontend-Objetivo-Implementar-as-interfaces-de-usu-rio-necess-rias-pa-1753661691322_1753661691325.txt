
# Prompt 3: Alterações no Frontend

## Objetivo
Implementar as interfaces de usuário necessárias para o novo processo de inventário, incluindo a Mesa de Controle e formulários aprimorados.

## Contexto
Com o backend implementado, agora precisamos criar/atualizar as interfaces para:
- Formulário de criação com seleção múltipla
- Mesa de Controle com KPIs
- Interface de contagens individuais
- Controle de patrimônio
- Gestão de status

## Tarefas Específicas

### 1. Atualizar Formulário de Inventário (components/inventory-form.tsx)
- Seleção múltipla de locais com "Selecionar Todos"
- Seleção múltipla de categorias com "Selecionar Todos"
- Campo de data de previsão de término
- Validação de seleções obrigatórias

### 2. Criar Mesa de Controle (pages/inventory-control-board.tsx)
- **Header com 4 KPIs:**
  - Quantidade de Produtos
  - Quantidade de Categorias  
  - Percentual Inventariado
  - Tempo Decorrido
- **Tabela principal com colunas:**
  - Produto, Local de Estoque, Quantidade Estoque
  - C1, C2, C3, C4 (com indicadores visuais)
  - Quantidade Final, Diferença, Acuracidade
- **Footer com totalizações**
- Filtros e busca avançada
- Exportação de relatórios

### 3. Atualizar Tela de Contagem (pages/inventory-counting.tsx)
- Interface para contagens individuais (C1, C2, C3, C4)
- Indicadores visuais de status por contagem
- Validação de sequência de contagens
- Interface para contadores designados
- Alertas para divergências

### 4. Criar Tela de Patrimônio (pages/inventory-asset-control.tsx)
- Listagem de stock_items do inventário
- Contagem por número de série
- Interface similar à contagem regular
- Controle de patrimônio específico

### 5. Atualizar Componentes de Status
- Badge component com novos status
- Progress indicators para contagens
- Timeline de progresso do inventário
- Alertas e notificações contextuais

### 6. Criar Componentes Específicos
- `CountingStageCard` - Card de estágio de contagem
- `AccuracyIndicator` - Indicador de acuracidade
- `DifferenceDisplay` - Exibição de diferenças
- `KPICard` - Card de KPI para Mesa de Controle
- `AssetCountingForm` - Formulário de contagem de patrimônio

### 7. Atualizar Navegação
- Adicionar "Mesa de Controle" no menu
- Breadcrumbs melhorados
- Links contextuais entre telas

Execute este prompt após completar as alterações do backend.
