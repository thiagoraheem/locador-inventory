# Sistema de Inventário Locador

[![Build](https://img.shields.io/badge/build-n%C3%A3o_configurado-lightgrey)](#status-do-projeto)
[![Cobertura](https://img.shields.io/badge/coverage-n%C3%A3o_configurada-lightgrey)](#status-do-projeto)
[![Versão](https://img.shields.io/badge/version-1.0.0-blue)](./package.json)
[![Licença](https://img.shields.io/badge/license-MIT-green)](#licen%C3%A7a)

Plataforma full stack para gestão de inventário com contagem multi-estágio (C1–C4), controle de patrimônio por número de série, auditoria completa e integração com ERP.  
O projeto combina interface web responsiva (desktop/tablet/mobile), APIs REST em Node.js/Express e persistência em SQL Server.

## Sumário

- [Visão Geral](#visão-geral)
- [Demonstração Visual](#demonstração-visual)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [Documentação da API](#documentação-da-api)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Status do Projeto](#status-do-projeto)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Links Úteis](#links-úteis)

## Visão Geral

O **Locador Inventory** foi desenvolvido para suportar operações de inventário em escala com rastreabilidade ponta a ponta:

- Fluxo de inventário em múltiplas contagens (C1, C2, C3 e C4/auditoria).
- Tratamento de divergências de quantidade e de número de série.
- Painéis operacionais com KPIs de progresso, acuracidade e conformidade.
- Registro de auditoria das ações executadas por usuários.
- Integração com ERP para importação e reconciliação.

## Demonstração Visual

> Não há imagens versionadas no repositório atualmente. Esta seção já está preparada para uso no GitHub.

| Tela | Preview |
|---|---|
| Dashboard operacional | ![Dashboard](docs/images/dashboard.png) |
| Fluxo de contagem mobile | ![Mobile Counting](docs/images/mobile-counting.gif) |
| Mesa de controle | ![Control Board](docs/images/control-board.png) |

Sugestão: adicione os arquivos em `docs/images/` com os nomes acima para ativar a pré-visualização automática.

## Funcionalidades Principais

- **Inventário multi-estágio**: contagens C1/C2 obrigatórias, C3 condicional e C4 para auditoria.
- **Controle de patrimônio**: leitura e validação por número de série.
- **Mesa de controle**: visão consolidada do inventário ativo com indicadores em tempo real.
- **Relatórios**: geração de relatórios de reconciliação e resultados finais.
- **Gestão administrativa**: usuários, produtos, categorias, locais, estoque e parâmetros de operação.
- **Auditoria e segurança**: trilha de auditoria, controle de sessão e rate limiting.

## Arquitetura

Arquitetura full stack em repositório único:

```text
client (React + Vite)
   ↓ HTTP (JSON)
server (Express + módulos de rotas/serviços/repositórios)
   ↓
SQL Server (mssql)
```

### Componentes principais

- **Frontend (`client/src`)**
  - React 18, roteamento com Wouter, cache/estado assíncrono com React Query.
  - UI baseada em Tailwind CSS + Radix UI + componentes estilo shadcn/ui.
- **Backend (`server`)**
  - API REST em Express.
  - Organização por módulos (`routes`, `controllers`, `services`, `repositories`, `middlewares`).
  - Endpoints de autenticação, inventário, relatórios e divergências de série.
- **Modelo compartilhado (`shared`)**
  - Tipagem e validações (Zod) reutilizadas entre backend e frontend.
- **Banco de dados (`sql`)**
  - Scripts de criação/evolução para SQL Server.

## Tecnologias

### Linguagens

- TypeScript (frontend e backend)
- JavaScript (testes E2E e configurações)
- SQL (scripts de banco)

### Frameworks e bibliotecas principais

- **Frontend**
  - React 18
  - Vite
  - Wouter
  - @tanstack/react-query
  - Tailwind CSS
  - Radix UI
  - Recharts
  - React Hook Form + Zod
- **Backend**
  - Node.js
  - Express
  - express-session
  - express-rate-limit
  - mssql
  - swagger-ui-express
- **Qualidade e testes**
  - TypeScript (`tsc`)
  - TSX test runner (`tsx --test`)
  - Playwright
  - Jest (dependência presente)

## Pré-requisitos

- **Node.js** 20+
- **npm** 10+ (ou **pnpm** 9+)
- **SQL Server** acessível pela aplicação
- Variáveis de ambiente configuradas em `.env`

## Instalação e Configuração

### 1) Clonar o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd locador-inventory
```

### 2) Instalar dependências

Com npm:

```bash
npm install
```

Ou com pnpm:

```bash
pnpm install
```

### 3) Configurar variáveis de ambiente

Linux/macOS:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Edite o `.env` com os valores do seu ambiente:

- `PORT`
- `SESSION_SECRET`
- `VITE_API_BASE_URL`
- `DB_SERVER`
- `DB_DATABASE`
- `DB_USER`
- `DB_PASSWORD`

> Segurança: use segredos próprios e nunca publique tokens/senhas reais.

### 4) Preparar banco de dados

Opção A (recomendada): execute os scripts da pasta `sql/` no seu SQL Server.  
Opção B: utilize endpoint de setup quando aplicável (`POST /api/setup-sqlserver`).

### 5) Subir em desenvolvimento

```bash
npm run dev
```

Aplicação disponível em `http://localhost:5401` (ou porta definida em `PORT`).

### 6) Build de produção

```bash
npm run build
npm run start
```

## Uso

### Fluxo funcional (resumo)

1. Autenticar no sistema.
2. Cadastrar/validar produtos, locais, categorias e estoque.
3. Criar inventário (tipo, escopo e filtros).
4. Executar contagens (C1/C2/C3/C4).
5. Monitorar KPIs na mesa de controle.
6. Resolver divergências e emitir relatórios.

### Exemplo de autenticação (API)

```bash
curl -X POST http://localhost:5401/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"sua_senha\"}"
```

### Exemplo de consumo de endpoint (frontend)

```ts
const response = await fetch("/api/dashboard/stats", {
  credentials: "include",
});

if (!response.ok) {
  throw new Error("Falha ao carregar indicadores");
}

const stats = await response.json();
console.log(stats);
```

## Documentação da API

- **Swagger UI (runtime):** `http://localhost:5401/api/docs`
- **Arquivo OpenAPI no repositório:** `docs/swagger.json`
- **Rotas de domínio relevantes:**
  - `server/routes/auth.routes.ts`
  - `server/routes/inventory.routes.ts`
  - `server/routes/report.routes.ts`
  - `server/routes/product.routes.ts`
  - `server/routes/user.routes.ts`
  - `server/routes/serial-discrepancies.ts`

> Observação: o `docs/swagger.json` atual está mínimo e pode ser expandido para refletir 100% dos endpoints.

## Estrutura de Pastas

```text
locador-inventory/
├─ client/                 # Frontend React
│  └─ src/
│     ├─ components/
│     ├─ contexts/
│     ├─ hooks/
│     ├─ lib/
│     └─ pages/
├─ server/                 # Backend Express
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ repositories/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
├─ shared/                 # Tipos e schemas compartilhados
├─ sql/                    # Scripts SQL Server
├─ docs/                   # Documentação funcional/técnica
├─ tests/                  # Testes E2E/funcionais
├─ package.json
└─ vite.config.ts
```

## Status do Projeto

- Build e cobertura ainda sem pipeline pública configurada.
- Suite de testes disponível localmente:

```bash
npm run test
npx playwright test
```

## Contribuição

Contribuições são bem-vindas.

1. Faça um fork do projeto.
2. Crie uma branch de feature/correção:

```bash
git checkout -b feat/minha-melhoria
```

3. Mantenha padrão de código e rode validações locais:

```bash
npm run check
npm run test
```

4. Abra um Pull Request com:
   - Contexto do problema
   - Solução proposta
   - Evidências de teste (logs, prints ou vídeos)

## Licença

Este projeto está sob a licença **MIT**.

## Links Úteis

- **Manual do usuário:** [docs/manual-usuario.md](docs/manual-usuario.md)
- **Documentação técnica do dashboard:** [docs/dashboard-documentacao-tecnica.md](docs/dashboard-documentacao-tecnica.md)
- **Estrutura de dados:** [docs/data-structure.md](docs/data-structure.md)
- **Serviços e regras de backend:** [docs/services.md](docs/services.md)
- **Plano de refatoração:** [docs/plano-refatoracao-backend.md](docs/plano-refatoracao-backend.md)
- **Teste de integração:** [docs/test-integration.md](docs/test-integration.md)
- **Demo online:** defina aqui o link público quando disponível (ex.: `https://inventory.seudominio.com`)
