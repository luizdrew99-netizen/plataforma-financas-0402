# CRM de Proteção Veicular — ABPAC

CRM para simulação, proposta em PDF e gestão da carteira da **ABPAC —
Associação de Benefícios e Proteção ao Amigo Caminhoneiro**. Ocupa todo o
projeto: a raiz redireciona para `/crm`.

> O app de finanças (ProFin) que existia aqui foi aposentado. As cinco tabelas
> dele no projeto `profin` estavam **zeradas**, e como o Next tem um único
> `NEXT_PUBLIC_SUPABASE_URL`, manter os dois exigiria dois clientes Supabase e
> duas telas de login. As rotas `/dashboard` e os componentes de finanças foram
> removidos; o `/auth` foi rebrandeado e agora leva ao CRM.

## Onde fica o banco

No projeto Supabase **`pgycjyrcjxtjptcfxzvx`** (`https://pgycjyrcjxtjptcfxzvx.supabase.co`),
que é o mesmo do sistema anterior: nome da associação, logo, faixas de
categoria, coberturas, benefícios e usuários já estavam lá e foram
aproveitados. **Este app não criou banco novo** — só acrescentou o que faltava
(ver `supabase/migrations/README.md`).

> Atenção: o projeto `profin` é o do app de finanças. O CRM **não** usa aquele.

### Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://pgycjyrcjxtjptcfxzvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon do projeto>
```

Em produção (Vercel), configure as duas no painel do projeto. Localmente elas
vão em `.env.local`, que não é versionado.

### Primeiro acesso

O trigger `handle_new_user` cria o perfil no cadastro: o **primeiro** usuário
do sistema vira `admin`, os seguintes entram como `consultor` e são promovidos
em *Usuários*. Hoje já existem dois usuários no banco.

Depois de entrar, complete **Configurações → Empresa**: CNPJ, telefone,
WhatsApp, e-mail, endereço e a assinatura. Esses campos saem impressos na
proposta e hoje estão vazios (só o nome, a logo e o rodapé estão preenchidos).

## Como o sistema funciona

```
Nova Simulação (4 etapas)  →  Gerar Simulação  →  PDF baixado + arquivado
        ↓                                              ↓
   cliente + veículo + simulação                 Confirmar Simulação
   numa transação só (salvar_simulacao)                 ↓
                                              Contrato (CTR-2026-000001)
```

### Cálculo

```
total mensal = rateio + proteção para terceiros + assistência 24h + benefícios extras
```

A **taxa de adesão é cobrança única** e não entra na mensalidade. A conta
existe em dois lugares de propósito: a tela precisa do total em tempo real
enquanto o consultor digita (`src/lib/crm/calc.ts`), e o banco tem
`total_mensal` como **coluna gerada** — essa é a fonte da verdade. *Se a
fórmula mudar, tem que mudar nos dois.*

### Categoria automática

Sai do valor de mercado pela faixa cadastrada em *Configurações → Categorias*.
Se um valor cair num vão entre faixas, `salvar_simulacao` usa a faixa mais
próxima por baixo — nunca deixa a simulação sem categoria. Para conferir se
existem buracos, o banco tem `verificar_lacunas_categorias()`.

Note que **o valor de mercado pertence à simulação, não ao veículo**: o mesmo
caminhão pode ser reavaliado em datas diferentes.

### Snapshot

`salvar_simulacao` grava dentro da simulação um `snapshot` com empresa,
categoria, valores, coberturas e benefícios **como estavam no momento da
venda**. O PDF e a página pública leem dali. Editar o texto de um benefício em
Configurações amanhã não muda nenhuma proposta já emitida.

### PDF

Gerado com `@react-pdf/renderer` no navegador — PDF vetorial de verdade, sem
headless Chrome, o que funciona em deploy serverless (Vercel). Fluxo em
`src/lib/crm/pdf/gerar.ts`:

1. Resolve o QR code e baixa a logo convertendo para data URL. Se a logo não
   vier, cai no monograma em vez de quebrar o documento.
2. Renderiza e **entrega o download primeiro**.
3. Só então arquiva no bucket `propostas` — se o Storage falhar, o consultor já
   está com o arquivo na mão e a tela avisa que não deu para arquivar.

Cada geração vira uma **versão nova** em `simulacao_pdfs`. O módulo é carregado
sob demanda (`await import(...)`) para não pesar o bundle das telas que só
listam.

### Link público / QR code

O QR aponta para `/proposta/<token>`, que abre **sem login** pela RPC
`proposta_publica` — ela respeita `token_revogado` e `token_expira_em`, e
devolve só o que já está no papel que o cliente recebeu (verificado: não expõe
telefone do cliente nem id de usuário).

### Papéis

| Papel | Pode |
|---|---|
| `consultor` | criar e editar simulações, clientes, veículos e contratos |
| `supervisor` | tudo do consultor + excluir registros + ver auditoria |
| `admin` | tudo + configurações, categorias, coberturas, benefícios e usuários |

### Auditoria

O trigger `registrar_auditoria` do sistema anterior continua gravando em
`auditoria` (tabela, registro, ação, usuário, antes/depois). Falta a tela de
consulta.

## Mapa dos arquivos

```
supabase/migrations/            o que este app acrescentou ao banco (README explica)

src/lib/crm/
  types.ts        tipos espelhando as tabelas reais
  format.ts       moeda, placa, CPF/CNPJ, telefone, datas (pt-BR)
  calc.ts         total mensal, categoria por valor, validações
  queries.ts      acesso a dados (Supabase)
  pdf/
    documento-proposta.tsx   layout do PDF, lendo do snapshot
    gerar.ts                 QR + logo, renderiza, baixa e arquiva
    link.ts                  link público (módulo leve, sem react-pdf)

src/components/crm/
  provedor-crm.tsx         contexto: perfil + cadastros base
  barra-lateral.tsx        menu lateral recolhível
  cabecalho.tsx            topo + busca global
  formulario-simulacao.tsx wizard de 4 etapas (criar e editar)
  campo-moeda.tsx          input de dinheiro pt-BR
  etiquetas.tsx            badges de status/situação/categoria

src/app/crm/               telas do CRM
src/app/proposta/[token]/  página pública da proposta
```

## O que foi verificado

O ambiente de desenvolvimento onde este código foi escrito **não tem saída de
rede para `*.supabase.co`** (o proxy nega o CONNECT), então não foi possível
clicar pelo navegador contra o banco real. A verificação foi feita por outro
caminho, executando o backend como usuário autenticado, sob RLS, com o payload
exato que o formulário monta:

- criar simulação → `SIM-2026-000002`, placa normalizada (`ozl7a96` → `OZL7A96`),
  categoria `R4`, total `1.402,00`, snapshot com a ABPAC, 11 coberturas e 2
  benefícios;
- editar → versão 2, categoria recalculada para `R5` ao mudar o valor para
  420.000, benefício extra somado, coluna gerada batendo com o snapshot
  (1.692 = 1.180 + 237 + 195 + 80);
- confirmar → `CTR-2026-000002` criado, simulação marcada como confirmada;
- duplicar → cópia como rascunho, sem tocar na original;
- busca global por placa, nome e telefone;
- `dashboard_resumo` com a série de 12 meses;
- link público como **anônimo**: devolve a proposta e nega token inválido;
  leitura direta das tabelas por anônimo retorna zero linhas;
- PDF renderizado a partir da linha real do banco (imagem conferida).

Todos os dados de teste foram removidos depois, e as configurações voltaram ao
estado anterior.

**Ainda não verificado por falta de rede no ambiente:** o clique real nas telas
contra o Supabase (login, navegação, download do PDF pelo botão) e o
carregamento da logo dentro do PDF. Vale um teste manual rápido no primeiro
acesso.

## Documentos, auditoria e vencimentos

**Documentos** ficam no bucket `documentos` e são anexados dentro do cadastro
do cliente (`GestorDocumentos`), com tipo (CRLV, CNH, contrato social,
comprovante, foto, laudo) e limite de 15 MB. Se o registro no banco falhar
depois do upload, o arquivo é removido do bucket — senão sobraria lixo sem
nada apontando para ele. A tela `/crm/documentos` lista tudo para consulta.

**Auditoria** (`/crm/auditoria`, só admin) lê a tabela `auditoria`, que já era
alimentada pelo trigger `registrar_auditoria`. A tela compara `dados_antes` e
`dados_depois` e mostra **apenas os campos que mudaram**, ignorando
`created_at`/`updated_at`.

**Vencimentos** não são coluna do banco: saem de `data_vencimento` (data
específica) ou, na falta dela, de `dia_vencimento` (dia do mês), pela regra em
`src/lib/crm/vencimentos.ts`. Detalhes que a regra trata: dia 31 em mês curto
cai no último dia do mês; contrato cancelado ou suspenso não entra em
cobrança; e a data vinda do banco é montada por partes, porque
`new Date("2026-08-10")` seria lido como UTC e poderia voltar um dia. Os
alertas aparecem no dashboard e na tela de contratos, com filtros por
vencidos / vencendo em 7 dias.

## Uma característica do modelo que vale saber

A RLS do sistema é **por dono**: `consultor` enxerga apenas os registros que
ele criou; `supervisor` e `admin` (`e_gestor()`) enxergam tudo. Isso vale para
clientes, veículos, simulações, PDFs e documentos. Na prática, o dashboard e a
busca de um consultor mostram só a carteira dele. Foi uma decisão do sistema
anterior e foi mantida.

## Backlog

- Relatórios por cliente/veículo e exportação em PDF (hoje só CSV, por período).
- Notificação ativa dos vencimentos (hoje o alerta é passivo, aparece ao abrir
  o sistema) — precisaria de e-mail/WhatsApp e de um agendador.
- Integrações: FIPE, leitura automática de placa, assinatura eletrônica,
  gateway de pagamento, envio automático de WhatsApp/SMS.
- Versionar no repositório as duas migrações do schema base
  (`supabase db pull`).
