
# Análise da Refatoração - Sistema de Inventário com Controle de Patrimônio

## Problema Identificado

O sistema atual não integra adequadamente o controle de estoque por quantidade com o controle de patrimônio por número de série, criando duas necessidades distintas durante o processo de inventário:

1. **Contagem por Quantidade**: Produtos sem controle individual (bulk items)
2. **Contagem por Número de Série**: Produtos com controle patrimonial individual

## Estrutura Atual vs. Necessária

### Estado Atual:
- `stock` - Controle de quantidades por produto/localização
- `stock_items` - Registros individuais com números de série
- `inventory_items` - Apenas contagem de quantidades
- Interface de contagem única para ambos os tipos

### Estado Necessário:
- Separação clara entre produtos com/sem controle de série
- Tabela específica para contagem de números de série
- Interface dual: quantidade vs. leitura de série
- Validação de existência de números de série
- Agrupamento visual por produto na listagem

## Requisitos Funcionais

### 1. Estrutura de Dados
- [ ] Nova tabela `inventory_serial_items` para controle de contagem por série
- [ ] Relacionamento entre `inventory_items` e `inventory_serial_items`
- [ ] Flag em produtos indicando se tem controle de série
- [ ] Campos de auditoria para rastreamento de leituras

### 2. Interface Mobile - Dual Input
- [ ] **Campo 1**: Leitura de código de barras (número de série)
  - Identifica produto automaticamente
  - Incrementa quantidade do produto
  - Marca série como lida
- [ ] **Campo 2**: Busca por SKU/Descrição + Quantidade
  - Busca flexível (SKU ou descrição)
  - Input manual de quantidade

### 3. Listagem Inteligente
- [ ] Agrupamento por produto
- [ ] Exibição de séries lidas por produto
- [ ] Contador de quantidades vs. séries encontradas
- [ ] Status visual de completude

### 4. Validações
- [ ] Verificação de existência de número de série
- [ ] Prevenção de dupla leitura da mesma série
- [ ] Alerta para séries não encontradas no sistema
- [ ] Reconciliação quantidade vs. séries contadas

## Fluxo de Processo Proposto

```
Inventário Criado
    ↓
Produtos Separados por Tipo
    ↓
┌─────────────────┬─────────────────┐
│ Sem Série       │ Com Série       │
│ (Quantidade)    │ (Individual)    │
└─────────────────┴─────────────────┘
    ↓                   ↓
Input Manual        Leitura Série
    ↓                   ↓
Lista Unificada ← ← ← ← ←
    ↓
Validação & Reconciliação
    ↓
Fechamento do Inventário
```

## Impactos Técnicos

### Database Schema
- Nova tabela para controle de séries
- Modificação em tabelas existentes
- Índices para performance de busca

### Backend APIs
- Endpoints para contagem por série
- Validação de existência de séries
- Reconciliação de dados

### Frontend Interfaces
- Refatoração da tela mobile
- Nova lógica de agrupamento
- Interface de validação/reconciliação

## Próximos Passos

1. **Database Schema**: Definir estrutura completa
2. **Backend Logic**: Implementar APIs e validações
3. **Frontend Refactor**: Criar interfaces adaptadas
4. **Testing & Integration**: Validar fluxo completo
