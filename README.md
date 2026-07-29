# ProFin — Gestão Financeira Profissional

Plataforma de controle financeiro para profissionais **CLT** e **MEI**: receitas,
despesas, contas a pagar, metas, agenda e análises automáticas.

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Supabase (Auth + Postgres).

---

## Como rodar

### 1. Dependências

```bash
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com os dados do seu projeto Supabase (Project Settings → API):

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys → `anon` `public` |
| `NEXT_PUBLIC_SITE_URL` | URL da aplicação (`http://localhost:3000` em dev) |

### 3. Banco de dados

Aplique a migration em `supabase/migrations/0001_init.sql`. Pelo SQL Editor do
painel do Supabase, cole o conteúdo do arquivo e execute. Com a CLI:

```bash
supabase db push
```

A migration cria as tabelas, as políticas de RLS e o trigger que gera o perfil
do usuário no cadastro. **Sem ela o app carrega mas não encontra o perfil.**

### 4. Configuração do Auth no Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (ou o domínio de produção)
- **Redirect URLs**: adicione `http://localhost:3000/auth/callback` e o
  equivalente em produção

Para o login com Google, habilite o provider em **Authentication → Providers**.

### 5. Subir

```bash
npm run dev
```

Acesse http://localhost:3000

---

## Estrutura

```
src/
├── app/
│   ├── page.tsx                    Landing page
│   ├── auth/
│   │   ├── page.tsx                Login, cadastro e recuperação de senha
│   │   ├── callback/route.ts       Troca do código PKCE por sessão (OAuth/email)
│   │   └── reset-password/         Definição da nova senha
│   ├── dashboard/
│   │   ├── page.tsx                Carrega o perfil e monta o painel
│   │   └── finance-context.tsx     Estado compartilhado dos dados financeiros
│   └── components/                 Seções do dashboard e diálogos de CRUD
├── components/ui/                  shadcn/ui
├── lib/
│   ├── supabase.ts                 Cliente do navegador (sessão em cookie)
│   ├── supabase-server.ts          Cliente para Server Components e rotas
│   ├── types.ts                    Tipos de domínio (espelham o schema)
│   ├── queries.ts                  Acesso ao banco
│   ├── finance.ts                  Cálculos: resumos, categorias, insights
│   └── format.ts                   Formatação pt-BR (moeda, datas, %)
├── middleware.ts                   Proteção de rotas + renovação de sessão
└── supabase/migrations/            Schema versionado
```

## Modelo de dados

| Tabela | Descrição |
| --- | --- |
| `profiles` | Dados do usuário e o tipo de perfil (`clt` / `mei`) |
| `financial_goals` | Metas com valor alvo, valor guardado e prazo |
| `transactions` | Receitas e despesas, com status de pagamento e recorrência |
| `calendar_events` | Compromissos da agenda financeira |
| `budgets` | Limite mensal por categoria, base da análise de orçamento |

Todas as tabelas têm RLS ativo: cada usuário só acessa as próprias linhas.

## Segurança

- Sessão em cookie `httpOnly` via `@supabase/ssr`; o middleware valida o token
  com `getUser()` a cada requisição em rota protegida.
- RLS no banco — a proteção não depende só do front-end.
- Sem `Access-Control-Allow-Origin: *`. Headers de segurança configurados em
  `next.config.ts`.
- O bridge de desenvolvimento (`lasy-bridge.js`) só é carregado em dev.

## Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (roda lint e checagem de tipos) |
| `npm start` | Serve o build |
| `npm run lint` | ESLint |

## Deploy

Na Vercel, configure as três variáveis de ambiente, aponte
`NEXT_PUBLIC_SITE_URL` para o domínio final e adicione
`https://SEU-DOMINIO/auth/callback` às Redirect URLs do Supabase.
