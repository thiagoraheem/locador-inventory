1) Prompt de fundação (contexto/sistema)

Objetivo: criar um dashboard ReactJS para acompanhamento em tempo real do inventário com 3 contagens, indicadores de acuracidade, divergências (faltas/sobras), valor em R$, processo e conformidade, e linha do tempo das contagens.
Regras do processo (fonte de verdade):
– Inventário tem 3 contagens: 1ª; se divergir, 2ª por outra pessoa; se persistir, 3ª final.
– Inventário cíclico (2x/ano) e rotativo por ciclos; divergências > R$ 20.000 exigem BO.
– Em cíclico: bloquear movimentações no sistema durante a execução; listas assinadas, dupla contagem às cegas.
– Pré-inventário obrigatório (organização, CP, prazos) e pós-inventário com relatório/resumo/divergências/recomendações.
Critérios de sucesso:

Dashboard renderiza e compila sem erros.

KPIs em cards/gráficos (tempo real) + filtros por área/contagem.

Código idiomático React, acessível (ARIA), organizado, testável.

Visual limpo (Tailwind opcional), com Recharts para gráficos.

Fácil trocar datasource (mock → API).

2) Contrato de dados (cole para o agente)

Crie (ou adapte) para o dashboard esta forma de dados:

{
  "snapshotAt": "2025-08-16T15:00:00Z",
  "totals": {
    "itemsPlanned": 500,
    "itemsCounted": 375,
    "progressPct": 75,
    "accuracyPct": 92,
    "divergenceValueBRL": 25000
  },
  "counts": [
    { "round": 1, "counted": 500, "consistentPct": 100 },
    { "round": 2, "counted": 95,  "consistentPct": 95 },
    { "round": 3, "counted": 40,  "consistentPct": 90 }
  ],
  "byArea": [
    { "area": "Almoxarifado", "progressPct": 80, "accuracyPct": 93 },
    { "area": "Manutenção",   "progressPct": 70, "accuracyPct": 90 },
    { "area": "Sucata",       "progressPct": 60, "accuracyPct": 95 }
  ],
  "pendingVsDone": { "pending": 120, "done": 380 },
  "divergences": [
    { "type": "Falta", "qty": 15, "valueBRL": 18000 },
    { "type": "Sobra", "qty": 8,  "valueBRL": 7000  },
    { "type": "Erro de Registro", "qty": 5, "valueBRL": 0 },
    { "type": "Mov. Não Contab.", "qty": 3, "valueBRL": 0 }
  ],
  "adjustments": { "immediatePct": 60, "postponedPct": 40 },
  "compliance": {
    "scheduleAdherencePct": 95,
    "movementsBlocked": true,
    "preInventoryDone": true,
    "needsBOOver20k": true
  },
  "items": [
    {
      "itemId": "CP-000123",
      "area": "Almoxarifado",
      "expectedQty": 4,
      "round1Qty": 4,
      "round2Qty": null,
      "round3Qty": null,
      "divergence": { "type": "Nenhuma", "valueBRL": 0 },
      "status": "Conforme"
    }
  ]
}


Observações obrigatórias para o agente:
– needsBOOver20k fica true se divergenceValueBRL > 20000.
– movementsBlocked deve refletir o bloqueio durante inventário cíclico.
– Use counts.round ∈ {1,2,3} para a timeline e “consistência por rodada”.
– byArea cobre: almoxarifado, manutenção, sucata etc..

3) Prompt para gerar o front (React + Recharts + Tailwind)

Tarefa: Gere um componente React chamado InventoryDashboard que recebe uma prop data no formato do contrato acima e renderiza:

Header com data/hora do snapshot e seletor de área (filtro).

Cards: Progresso (%), Acuracidade (%), Divergências (R$), Itens Pendentes/Concluídos.

Gráficos (Recharts):

Barra horizontal: Progresso da contagem (%).

Pizza: Acuracidade (Correto vs Erro).

Pizza: Pendentes vs Concluídos.

Barras: Divergências por tipo (qty) e um card mostrando divergenceValueBRL.

Barras: Recontagens (1ª, 2ª, 3ª).

Linha: Timeline de consistência por rodada (1→2→3).

Seção Processo/Conformidade com badges:

“Movimentações bloqueadas” (Sim/Não).

“Pré-inventário concluído” (Sim/Não).

“Adesão ao cronograma” (progress bar).

Alerta crítico se needsBOOver20k = true (texto: “Divergências > R$ 20.000: registrar BO”).

Tabela resumida de itens (10 linhas) com paginação e destaque para divergências.
Requisitos técnicos:
– React funcional (hooks).
– Estilo com Tailwind (ou CSS Modules se preferir).
– Recharts para os gráficos.
– A11y: ARIA nos cards, títulos H1/H2, contrastes adequados.
– Componentização: KpiCard, ProgressBar, DonutChart, BarChart, LineChart, CompliancePanel, ItemsTable.
– Tipagem (TypeScript opcional; se usar, definir DashboardData, Divergence, etc.).
– Sem dependência de back-end: inclua um mockData.ts baseado no contrato.
– Prop de atualização: aceite uma função onRefresh() para simular polling/SSE (chamar a cada 30s).
– Feature flag showMoney: quando false, ocultar valores em R$.

4) Prompt para integrar dados em tempo real

Adapte o componente para buscar dados de /api/inventory/snapshot a cada 30s (polling) ou via SSE/WebSocket se disponível.
– Em caso de erro, exiba Fallback discreto e mantenha último snapshot.
– Mostre a hora do último refresh.
– Permita filtro de área no client (aplicar no byArea e nos gráficos).
– Mantenha uma faixa superior com status: “Inventário Rotativo/Cíclico/Extraordinário”.

5) Prompt para estilos e UX

Aplique uma estética limpa:
– Layout em grid responsivo (2–3 colunas desktop; 1 coluna mobile).
– Cards com cantos arredondados, sombras suaves, ícones simples.
– Cores semânticas: progresso/ok (verde), pendente (âmbar), erro/divergência (vermelho).
– Tooltips nos gráficos e aria-labels nos elementos-chave.
– Estados de carregamento (skeletons) e vazio (mensagens amigáveis).

6) Prompt de testes e critérios de aceite

Inclua testes básicos (Jest/RTL) para:
– Renderização sem dados (fallbacks).
– Cálculos derivados (progress %, accuracy %, alerta > R$20k).
– Filtro por área.
– Acessibilidade mínima (títulos e labels).
Aceite quando:
– KPIs e gráficos batem com o contrato.
– Alerta > R$20k aparece quando devido.
– Bloqueio de movimentações e pré-inventário aparecem corretamente.

7) Prompt “one-shot” (gera tudo de uma vez)

Gere um projeto React com:
– src/data/mockData.ts com o JSON do contrato;
– src/components/ contendo KpiCard.tsx, ProgressBar.tsx, DonutChart.tsx, BarChart.tsx, LineChart.tsx, CompliancePanel.tsx, ItemsTable.tsx;
– src/InventoryDashboard.tsx que compõe tudo;
– src/App.tsx apenas monta <InventoryDashboard data={mockData} />;
– Tailwind configurado (ou CSS Modules, se preferir);
– Recharts instalado e utilizado;
– Testes básicos de render e lógica;
– Script npm start funcionando.
Considere as regras do processo e indicadores exigidos pela política.

8) Prompt para ajustes rápidos (exemplos)

“Troque pizza de Pendentes/Concluídos por barra empilhada e adicione porcentagens no eixo.”

“Adicione export CSV da tabela de itens e filtro por status.”

“Inclua um badge por área mostrando accuracy < 90% em vermelho.”

“Crie useDashboardPolling(intervalMs = 30000) e mova lógica de busca pra lá.”

“Adicionar dark mode com toggle e persistência em localStorage.”