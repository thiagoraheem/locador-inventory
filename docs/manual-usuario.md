# Manual do Usuário - Sistema de Inventário Locador

## Índice

1. [Visão Geral](#visão-geral)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Perfis de Usuário](#perfis-de-usuário)
4. [Navegação Principal](#navegação-principal)
5. [Módulos do Sistema](#módulos-do-sistema)
6. [Processo de Inventário](#processo-de-inventário)
7. [Contagem Mobile](#contagem-mobile)
8. [Mesa de Controle](#mesa-de-controle)
9. [Relatórios](#relatórios)
10. [Administração](#administração)
11. [Integração ERP](#integração-erp)
12. [Solução de Problemas](#solução-de-problemas)

---

## Visão Geral

O Sistema de Inventário Locador é uma solução completa para gestão de inventários com processo de contagem multi-estágio, controle de patrimônio e integração com ERP. O sistema oferece interfaces otimizadas para desktop e mobile, permitindo contagens precisas e auditoria completa.

### Principais Funcionalidades

- **Inventário Multi-Estágio**: Processo de contagem em 4 etapas (C1, C2, C3, C4)
- **Controle de Patrimônio**: Gestão de itens por número de série
- **Interface Mobile**: Otimizada para tablets e dispositivos móveis
- **Mesa de Controle**: Dashboard em tempo real com KPIs
- **Auditoria Completa**: Logs detalhados de todas as operações
- **Integração ERP**: Sincronização automática com sistema externo
- **Relatórios Avançados**: Relatórios detalhados e exportação

---

## Acesso ao Sistema

### Login

1. Acesse a URL do sistema
2. Digite seu **usuário** e **senha**
3. Clique em **"Entrar"**

### Credenciais Padrão

- **Administrador**: `admin` / (a ser informada)
- **Contador**: Credenciais fornecidas pelo administrador

### Recuperação de Senha

Entre em contato com o administrador do sistema para redefinir sua senha.

---

## Perfis de Usuário

O sistema possui diferentes perfis com permissões específicas:

### 👑 Administrador
- Acesso completo ao sistema
- Gerenciamento de usuários
- Configurações avançadas
- Testes de API
- Migração ERP

### 👨‍💼 Gerente
- Criação e gestão de inventários
- Mesa de controle
- Relatórios completos
- Auditoria de contagens

### 👨‍💼 Supervisor
- Mesa de controle
- Relatórios
- Auditoria de contagens
- Validação de divergências

### 📱 Contador
- Interface mobile simplificada
- Contagem de produtos
- Leitura de códigos de barras
- Registro de quantidades

### 👁️ Consulta
- Visualização de dados
- Relatórios básicos
- Sem permissões de edição

---

## Navegação Principal

### Menu Lateral

O menu lateral está organizado em seções:

#### 📊 Dashboard
- Visão geral do sistema
- Indicadores principais
- Acesso rápido às funcionalidades

#### 📁 Cadastros
- **Usuários**: Gestão de usuários do sistema
- **Empresas**: Cadastro de empresas
- **Categorias**: Categorias de produtos
- **Produtos**: Cadastro de produtos
- **Locais de Estoque**: Locais físicos
- **Controle de Patrimônio**: Itens patrimoniais

#### 📦 Controle de Estoque
- Visualização do estoque atual
- Movimentações
- Consultas avançadas

#### 📋 Inventários
- **Inventários**: Lista e criação
- **Contagens**: Interfaces de contagem
- **Mesa de Controle**: Dashboard operacional
- **Relatórios**: Relatórios diversos
- **Parâmetros/Regras**: Configurações

#### 📜 Logs de Auditoria
- Histórico de operações
- Rastreabilidade completa

---

## Módulos do Sistema

### 1. Gestão de Produtos

#### Cadastro de Produtos
- **SKU**: Código único do produto
- **Nome**: Descrição do produto
- **Categoria**: Classificação
- **Controle de Série**: Ativação do controle patrimonial
- **Status**: Ativo/Inativo

#### Funcionalidades
- Busca avançada
- Filtros por categoria
- Importação em lote
- Histórico de alterações

### 2. Locais de Estoque

#### Cadastro de Locais
- **Código**: Identificador único
- **Nome**: Descrição do local
- **Tipo**: Classificação do local
- **Status**: Ativo/Inativo

#### Hierarquia
- Locais principais
- Sub-locais
- Endereçamento detalhado

### 3. Controle de Patrimônio

#### Itens Patrimoniais
- **Número de Série**: Identificador único
- **Produto**: Vinculação ao cadastro
- **Local**: Localização atual
- **Status**: Encontrado/Não Encontrado/Pendente

---

## Processo de Inventário

### Criação de Inventário

1. **Acesse**: Inventários → Inventários
2. **Clique**: "Novo Inventário"
3. **Preencha**:
   - Nome do inventário
   - Tipo (Geral, Parcial, Cíclico)
   - Data de início
   - Locais (seleção múltipla)
   - Categorias (seleção múltipla)
4. **Confirme**: "Criar Inventário"

### Fluxo de Status

```
Criado → Em Andamento → Primeira Contagem → Segunda Contagem → 
Terceira Contagem (se necessário) → Auditoria → Fechado
```

### Etapas de Contagem

#### 1️⃣ Primeira Contagem (C1)
- **Obrigatória** para todos os itens
- Realizada por contador designado
- Interface mobile otimizada

#### 2️⃣ Segunda Contagem (C2)
- **Obrigatória** para todos os itens
- Preferencialmente por contador diferente
- Comparação automática com C1

#### 3️⃣ Terceira Contagem (C3)
- **Condicional**: apenas se C1 ≠ C2
- Resolve divergências
- Define quantidade final

#### 4️⃣ Auditoria (C4)
- **Opcional**: para validação final
- Realizada por supervisor/gerente
- Confirma quantidades finais

### Regras de Negócio

- **C1 e C2 são obrigatórias**
- **C3 só é necessária se C1 ≠ C2**
- **C4 é opcional para auditoria**
- **Transições de status são automáticas**
- **Cálculo de acuracidade automático**

---

## Contagem Mobile

### Interface Otimizada

A interface mobile é especialmente projetada para contadores:

#### Características
- **Touch-friendly**: Botões grandes e espaçados
- **Scanner integrado**: Leitura de códigos de barras
- **Busca rápida**: Localização de produtos
- **Offline-ready**: Funciona sem internet

### Processo de Contagem

#### 1. Seleção do Inventário
- Lista de inventários disponíveis
- Filtro por status
- Informações resumidas

#### 2. Busca de Produtos
- **Por código de barras**: Scanner automático
- **Por nome/SKU**: Busca textual
- **Por categoria**: Navegação estruturada

#### 3. Registro de Quantidade
- **Teclado numérico**: Entrada rápida
- **Botões +/-**: Ajuste fino
- **Confirmação visual**: Feedback imediato

#### 4. Produtos com Série
- **Leitura individual**: Cada número de série
- **Validação automática**: Verificação de existência
- **Status visual**: Encontrado/Não encontrado

### Funcionalidades Especiais

#### Busca Inteligente
- Sugestões automáticas
- Histórico de buscas
- Produtos recentes

#### Validações
- Verificação de duplicatas
- Alertas de divergência
- Confirmação de quantidades

#### Sincronização
- Upload automático
- Retry em caso de falha
- Indicador de status

---

## Mesa de Controle

### Dashboard Operacional

A Mesa de Controle oferece visão em tempo real do inventário:

#### KPIs Principais
- **Progresso Geral**: % de conclusão
- **Itens Contados**: Quantidade absoluta
- **Divergências**: Itens com diferenças
- **Acuracidade**: % de precisão
- **Participantes**: Contadores ativos

#### Gráficos e Indicadores
- **Progresso por Local**: Barra de progresso
- **Status por Categoria**: Distribuição visual
- **Timeline**: Evolução temporal
- **Alertas**: Notificações importantes

### Funcionalidades

#### Filtros Avançados
- **Por local**: Específico ou múltiplos
- **Por categoria**: Filtro dinâmico
- **Por status**: Estado atual
- **Por contador**: Responsável

#### Ações Disponíveis
- **Refresh**: Atualização manual
- **Export**: Exportação de dados
- **Drill-down**: Detalhamento
- **Auditoria**: Modo de validação

### Mesa de Controle CP (Controle de Patrimônio)

Versão especializada para itens patrimoniais:

#### Características Específicas
- **Controle por série**: Item a item
- **Status detalhado**: Encontrado/Perdido/Pendente
- **Localização**: Rastreamento de posição
- **Histórico**: Movimentações anteriores

---

## Relatórios

### Tipos de Relatórios

#### 1. Listagem de Produtos
- **Conteúdo**: Produtos do inventário
- **Filtros**: Local, categoria, status
- **Formato**: PDF, Excel
- **Informações**: SKU, nome, quantidade, local

#### 2. Relatório de Inventário Fechado
- **Conteúdo**: Resultado final do inventário
- **Dados**: Quantidades por estágio
- **Divergências**: Análise de diferenças
- **Participantes**: Contadores envolvidos

#### 3. Relatório de Acuracidade
- **Métricas**: Precisão por local/categoria
- **Comparações**: Entre contagens
- **Tendências**: Evolução temporal
- **Benchmarks**: Metas vs. realizado

### Geração de Relatórios

#### Processo
1. **Selecione** o tipo de relatório
2. **Configure** filtros e parâmetros
3. **Escolha** formato (PDF/Excel)
4. **Gere** e faça download

#### Agendamento
- **Automático**: Relatórios periódicos
- **Triggers**: Baseado em eventos
- **Email**: Envio automático
- **Histórico**: Versões anteriores

---

## Administração

### Gestão de Usuários

#### Criação de Usuários
1. **Acesse**: Cadastros → Usuários
2. **Clique**: "Novo Usuário"
3. **Preencha**:
   - Nome de usuário
   - Email
   - Nome completo
   - Perfil/Role
   - Senha inicial
4. **Salve**: Confirme a criação

#### Perfis Disponíveis
- **admin**: Administrador completo
- **gerente**: Gerente operacional
- **supervisor**: Supervisor de contagem
- **contador**: Operador de contagem
- **consulta**: Apenas visualização

#### Gerenciamento
- **Ativação/Desativação**: Controle de acesso
- **Alteração de perfil**: Mudança de permissões
- **Reset de senha**: Redefinição
- **Auditoria**: Histórico de ações

### Configurações do Sistema

#### Parâmetros Gerais
- **Timeout de sessão**: Tempo limite
- **Backup automático**: Frequência
- **Logs de auditoria**: Retenção
- **Notificações**: Configurações

#### Regras de Negócio
- **Contagens obrigatórias**: C1, C2
- **Limite de divergência**: % aceitável
- **Aprovação de auditoria**: Workflow
- **Integração ERP**: Configurações

---

## Integração ERP

### Configuração

#### Parâmetros de Conexão
- **URL do ERP**: Endpoint da API
- **Token de autenticação**: Credenciais
- **Timeout**: Tempo limite
- **Retry**: Tentativas de reconexão

#### Mapeamento de Dados
- **Produtos**: Correspondência SKU
- **Locais**: Mapeamento de códigos
- **Quantidades**: Formato de dados
- **Status**: Estados equivalentes

### Processo de Migração

#### Pré-requisitos
- Inventário fechado
- Validação completa
- Aprovação gerencial
- Backup de segurança

#### Etapas
1. **Validação**: Verificação de dados
2. **Preparação**: Formatação para ERP
3. **Transmissão**: Envio dos dados
4. **Confirmação**: Validação no ERP
5. **Auditoria**: Log da operação

#### Monitoramento
- **Status em tempo real**: Progresso da migração
- **Logs detalhados**: Registro de operações
- **Alertas**: Notificação de problemas
- **Rollback**: Reversão se necessário

### Endpoints Disponíveis

#### Atualização Individual
- **Endpoint**: `/api/Estoque/atualizar`
- **Método**: PATCH
- **Dados**: Item específico

#### Atualização em Lote
- **Endpoint**: `/api/Estoque/atualizar-lista`
- **Método**: PATCH
- **Dados**: Lista de itens

#### Congelamento de Estoque
- **Endpoint**: `/api/Estoque/congelar`
- **Método**: POST
- **Função**: Bloquear movimentações

---

## Solução de Problemas

### Problemas Comuns

#### 1. Erro de Login
**Sintomas**: Não consegue acessar o sistema
**Soluções**:
- Verificar usuário e senha
- Confirmar se usuário está ativo
- Limpar cache do navegador
- Contatar administrador

#### 2. Scanner não Funciona
**Sintomas**: Código de barras não é lido
**Soluções**:
- Verificar permissões da câmera
- Limpar lente da câmera
- Usar entrada manual
- Reiniciar aplicação

#### 3. Dados não Sincronizam
**Sintomas**: Contagens não aparecem no sistema
**Soluções**:
- Verificar conexão de internet
- Forçar sincronização
- Verificar logs de erro
- Contatar suporte técnico

#### 4. Relatório não Gera
**Sintomas**: Erro ao gerar relatório
**Soluções**:
- Verificar filtros aplicados
- Reduzir período de dados
- Tentar formato diferente
- Verificar permissões

### Logs e Auditoria

#### Localização dos Logs
- **Menu**: Logs de Auditoria
- **Filtros**: Por usuário, data, operação
- **Detalhes**: Informações completas
- **Export**: Exportação para análise

#### Informações Registradas
- **Usuário**: Quem executou
- **Operação**: O que foi feito
- **Timestamp**: Quando ocorreu
- **Dados**: Valores antes/depois
- **IP**: Origem da operação

### Contato para Suporte

#### Informações Necessárias
- **Usuário**: Nome do usuário
- **Erro**: Mensagem exata
- **Contexto**: O que estava fazendo
- **Navegador**: Versão e tipo
- **Screenshots**: Se possível

#### Canais de Suporte
- **Email**: sistema@blomaq.com.br
- **Telefone**: (92) 99200-2858
- **Documentação**: Manual técnico

---

## Anexos

### Glossário

- **SKU**: Stock Keeping Unit (Código do produto)
- **ERP**: Enterprise Resource Planning
- **API**: Application Programming Interface
- **KPI**: Key Performance Indicator
- **C1, C2, C3, C4**: Estágios de contagem

### Atalhos de Teclado

- **Ctrl + F**: Busca rápida
- **Ctrl + R**: Atualizar página
- **Esc**: Fechar modal
- **Enter**: Confirmar ação
- **Tab**: Navegar entre campos

### Formatos Suportados

#### Importação
- **CSV**: Dados tabulares
- **Excel**: Planilhas (.xlsx)
- **JSON**: Dados estruturados

#### Exportação
- **PDF**: Relatórios formatados
- **Excel**: Dados para análise
- **CSV**: Dados brutos

---

*Manual do Usuário - Sistema de Inventário Locador*  
*Versão 1.0 - Agosto 2025*  
*© 2025 Locador - Todos os direitos reservados*