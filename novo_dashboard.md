# Dashboard de Inventário - Documentação

## Visão Geral

O Dashboard de Inventário é uma interface analítica e operacional que fornece uma visão em tempo real do estado do inventário, permitindo monitoramento de métricas-chave, análise de tendências e identificação de divergências.

## Funcionalidades Principais

### 1. Métricas em Tempo Real (KPIs)
- **Total de Itens**: Contagem total de itens no inventário
- **Itens Contados**: Número de itens já processados
- **Itens Pendentes**: Itens aguardando contagem
- **Acuracidade**: Percentual de precisão do inventário
- **Divergência Financeira**: Valor total das divergências encontradas (com feature flag para ocultar valores)

### 2. Visualizações Gráficas
- **Gráfico de Rosca (DonutChart)**: Distribuição de status dos itens
- **Gráfico de Barras (BarChart)**: Análise por categorias com valores monetários
- **Gráfico de Linha (LineChart)**: Timeline de consistência e progresso
- **Painel de Conformidade**: Status de processos e compliance

### 3. Tabela de Itens
- Listagem detalhada dos itens do inventário
- Filtros e busca avançada
- Paginação para performance
- Exibição de valores unitários (controlada por feature flag)

### 4. Feature Flag - Show Money
- **Contexto**: `ShowMoneyContext` gerencia a visibilidade de valores monetários
- **Toggle**: Botão no cabeçalho permite alternar entre mostrar/ocultar valores
- **Componentes Afetados**:
  - KpiCard (valores monetários)
  - BarChart (valores em BRL)
  - ItemsTable (valor unitário)
  - CompliancePanel (referências a valores > R$ 20k)

## Estrutura de Arquivos

```
client/src/
├── components/dashboard/
│   ├── InventoryDashboard.tsx      # Componente principal
│   ├── KpiCard.tsx                 # Cards de métricas
│   ├── DonutChart.tsx              # Gráfico de rosca
│   ├── BarChart.tsx                # Gráfico de barras
│   ├── LineChart.tsx               # Gráfico de linha
│   ├── CompliancePanel.tsx         # Painel de conformidade
│   ├── ItemsTable.tsx              # Tabela de itens
│   └── __tests__/                  # Testes dos componentes
├── contexts/
│   └── ShowMoneyContext.tsx        # Contexto para feature flag
├── hooks/
│   ├── useDashboardPolling.tsx     # Hook para polling de dados
│   └── __tests__/                  # Testes dos hooks
├── data/
│   └── mockDashboardData.ts        # Dados mock para desenvolvimento
└── pages/
    └── InventoryDashboardPage.tsx  # Página do dashboard
```

## Tecnologias Utilizadas

- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Shadcn/UI**: Biblioteca de componentes
- **Recharts**: Biblioteca de gráficos
- **Tailwind CSS**: Estilização
- **React Testing Library**: Testes unitários

## Responsividade

O dashboard foi desenvolvido com design responsivo:
- **Desktop**: Layout completo com todas as funcionalidades
- **Tablet**: Adaptação de grid e espaçamentos
- **Mobile**: Interface otimizada com navegação por abas

## Polling e Atualização Automática

- **Hook personalizado**: `useDashboardPolling`
- **Intervalo configurável**: Padrão de 30 segundos
- **Controle manual**: Botão de atualização disponível
- **Tratamento de erros**: Exibição de mensagens de erro

## Testes

Todos os componentes principais possuem testes unitários:
- **KpiCard**: 3 testes (renderização, formatação, props)
- **DonutChart**: 3 testes (dados, loading, responsividade)
- **useDashboardPolling**: 5 testes (polling, erros, consistência)

## API Integration

### Endpoint Principal
```
GET /api/inventory/snapshot
```

### Estrutura de Resposta
```typescript
interface DashboardData {
  totals: {
    totalItems: number;
    countedItems: number;
    pendingItems: number;
    accuracy: number;
    financialDivergence: number;
  };
  categories: CategoryData[];
  timeline: TimelineData[];
  compliance: ComplianceData;
  items: InventoryItem[];
}
```

## Configuração e Personalização

O dashboard aceita diversas configurações:

```typescript
interface DashboardConfig {
  showRefresh: boolean;        // Botão de atualização
  showExport: boolean;         // Funcionalidade de export
  showSettings: boolean;       // Painel de configurações
  showMoney: boolean;          // Valores monetários (padrão)
  autoRefresh: boolean;        // Atualização automática
  refreshInterval: number;     // Intervalo em ms
  showFilters: boolean;        // Filtros avançados
  showSearch: boolean;         // Busca
  showDateRange: boolean;      // Seletor de período
  showNotifications: boolean;  // Notificações
  showHelp: boolean;          // Ajuda contextual
  theme: 'light' | 'dark';    // Tema visual
}
```

## Roteamento

O dashboard está integrado ao sistema de rotas:
- **Rota**: `/inventory-dashboard`
- **Menu**: Adicionado ao menu lateral de Inventários
- **Proteção**: Requer autenticação (seguindo padrão do sistema)

## Performance

### Otimizações Implementadas
- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: Componentes React.memo onde apropriado
- **Paginação**: Tabela com paginação para grandes datasets
- **Debounce**: Busca com debounce para reduzir requisições
- **Skeleton Loading**: Estados de carregamento informativos

## Manutenção e Extensibilidade

### Adicionando Novos Gráficos
1. Criar componente em `components/dashboard/`
2. Adicionar tipos em `shared/dashboard-types.ts`
3. Integrar ao `InventoryDashboard.tsx`
4. Adicionar testes correspondentes

### Modificando Feature Flags
1. Atualizar `ShowMoneyContext.tsx`
2. Aplicar lógica nos componentes afetados
3. Atualizar testes para cobrir novos cenários

### Adicionando Novas Métricas
1. Atualizar interface `DashboardData`
2. Modificar endpoint `/api/inventory/snapshot`
3. Criar ou atualizar componentes KpiCard
4. Adicionar aos dados mock para desenvolvimento

## Troubleshooting

### Problemas Comuns

1. **Dados não carregam**
   - Verificar se o endpoint `/api/inventory/snapshot` está funcionando
   - Checar logs do console para erros de rede
   - Validar estrutura de dados retornada

2. **Gráficos não renderizam**
   - Verificar se os dados estão no formato esperado
   - Checar se as dependências do Recharts estão instaladas
   - Validar propriedades obrigatórias dos componentes

3. **Feature flag não funciona**
   - Verificar se o componente está dentro do `ShowMoneyProvider`
   - Checar se o hook `useShowMoney` está sendo usado corretamente
   - Validar se todos os valores monetários estão sendo tratados

4. **Performance lenta**
   - Verificar intervalo de polling (pode estar muito baixo)
   - Checar se há vazamentos de memória nos useEffect
   - Validar se a paginação está funcionando corretamente

## Próximos Passos

### Melhorias Futuras
- [ ] Filtros avançados por período
- [ ] Export para Excel/PDF
- [ ] Notificações push para divergências críticas
- [ ] Dashboard customizável (drag & drop)
- [ ] Integração com sistema de alertas
- [ ] Modo offline com cache local
- [ ] Análise preditiva com ML

### Monitoramento
- [ ] Métricas de performance do dashboard
- [ ] Logs de uso e interações
- [ ] Alertas para falhas de API
- [ ] Monitoramento de tempo de resposta

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Autor**: Sistema de Desenvolvimento Trae AI