# CRM de Proteção Veicular — ABPAC

Sistema da **ABPAC — Associação de Benefícios e Proteção ao Amigo Caminhoneiro**
para simular proteção veicular de caminhões, emitir a proposta em PDF e
administrar a carteira de clientes, veículos e contratos.

A documentação completa — arquitetura, regras de cálculo, papéis, o que já foi
verificado e o backlog — está em **[`docs/crm-protecao-veicular.md`](docs/crm-protecao-veicular.md)**.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha a chave anon
npm run dev
```

Abra <http://localhost:3000>. A raiz redireciona para `/crm`; sem sessão, o
CRM manda para a tela de login.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://pgycjyrcjxtjptcfxzvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon do projeto>
```

Sem elas o app ainda sobe, mas mostra um aviso dizendo o que falta configurar —
em vez de quebrar no build.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage, RLS) · `@react-pdf/renderer` para a proposta.

## Rotas

| Rota | O que é |
|---|---|
| `/` | redireciona para o CRM |
| `/auth` | login e cadastro |
| `/crm` | dashboard, simulações, clientes, veículos, contratos, documentos, relatórios, configurações, usuários e auditoria |
| `/proposta/<token>` | proposta pública — destino do QR code impresso no PDF, abre sem login |
