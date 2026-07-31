# CRM de Proteção Veicular para Caminhões

CRM completo para simulação, proposta em PDF e gestão de carteira de proteção
veicular. Vive em `/crm` dentro deste projeto Next.js, reaproveitando a
autenticação e o Supabase que já existiam aqui. O app de finanças (`/dashboard`)
continua funcionando sem alteração.

## Como colocar no ar

### 1. Aplicar a migração

```
supabase/migrations/20260731000100_crm_protecao_veicular.sql
```

Rode no SQL Editor do projeto Supabase (ou via `supabase db push`). Ela é
idempotente — pode rodar mais de uma vez sem quebrar. Cria:

- **Tabelas** (todas no schema `public`, com prefixo `crm_` para não colidir com
  as tabelas do app de finanças): `crm_usuarios`, `crm_configuracoes`,
  `crm_categorias`, `crm_coberturas`, `crm_beneficios`, `crm_clientes`,
  `crm_veiculos`, `crm_simulacoes`, `crm_cadastros`, `crm_pdfs`,
  `crm_documentos`, `crm_logs`.
- **Dados iniciais**: categorias R1–R5, as 11 coberturas padrão e os dois
  benefícios (Proteção para Terceiros e Assistência 24 Horas) com os textos
  completos.
- **RLS** em todas as tabelas, com três papéis: `admin`, `supervisor`,
  `consultor`.
- **Bucket** `crm-arquivos` (privado) para os PDFs e documentos anexos.

### 2. Variáveis de ambiente

As mesmas que o projeto já usa:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Primeiro acesso

Entre em `/auth`, faça login e abra `/crm`. **O primeiro usuário que abrir o CRM
vira administrador automaticamente**; os seguintes entram como consultor e
precisam ser promovidos em *Configurações → Usuários*.

Depois disso, vá em **Configurações → Empresa** e preencha nome, CNPJ, logo,
telefones e o texto do rodapé — é isso que sai impresso em toda proposta.

## Como o sistema funciona

### Fluxo principal

```
Nova Simulação (4 etapas)  →  Gerar Simulação  →  PDF baixado + arquivado
        ↓                                              ↓
   cliente + veículo criados                   Confirmar Simulação
   na mesma transação                                  ↓
                                              Cadastro definitivo (PF/PJ)
```

### Cálculo

```
valor mensal = rateio + proteção para terceiros + assistência 24h + benefícios extras
```

A **taxa de adesão é cobrança única** e não entra na mensalidade. A conta existe
em dois lugares de propósito: a tela precisa do total em tempo real enquanto o
consultor digita (`src/lib/crm/calc.ts`), e o banco calcula `valor_mensal` como
coluna gerada, que é a fonte da verdade usada no PDF. **Se mudar a fórmula, mude
nos dois lugares.**

### Categoria automática

A categoria sai do valor de mercado, pela faixa cadastrada em
*Configurações → Categorias*. As faixas iniciais são as do documento base,
**tornadas contíguas**: o texto original ia de "até 100.000" para "101.000 a
150.000", o que deixaria um caminhão de R$ 100.500 sem categoria nenhuma. Aqui
cada faixa começa um centavo depois do teto anterior. Se mesmo assim um valor
cair em um vão (porque o admin editou as faixas), a função
`crm_categoria_por_valor` devolve a faixa mais próxima por baixo — nunca
devolve vazio.

### Fotografia da proposta (snapshot)

Coberturas e benefícios são gravados **dentro da simulação** (`coberturas_snapshot`
e `beneficios_snapshot`), não por referência. Assim, editar o texto de um
benefício em Configurações não muda o que já foi vendido e impresso.

### PDF

Gerado com `@react-pdf/renderer` no navegador — PDF vetorial de verdade, sem
headless Chrome, o que faz funcionar em deploy serverless (Vercel). Fluxo em
`src/lib/crm/pdf/gerar.ts`:

1. Monta o QR code com o link público da proposta.
2. Renderiza o documento e **baixa primeiro**.
3. Só então arquiva no Storage — se o Storage falhar, o consultor já está com o
   arquivo na mão e a tela avisa que não deu para arquivar.

Cada geração vira uma **versão nova** em `crm_pdfs`. O módulo é carregado sob
demanda (`await import(...)`) para não pesar o bundle das telas que só listam.

### Link público / QR code

O QR do PDF aponta para `/proposta/<token>`, uma página que abre **sem login**.
Ela lê pela função `crm_proposta_publica`, que é `SECURITY DEFINER` e devolve
somente o que já está impresso no papel que o cliente recebeu — nada de telefone
do cliente, custo interno ou outras propostas. O token é um uuid aleatório e é a
única chave de acesso.

### Papéis

| Papel | Pode |
|---|---|
| `consultor` | criar e editar simulações, clientes, veículos e cadastros |
| `supervisor` | tudo do consultor + excluir registros + ver o log de auditoria |
| `admin` | tudo + editar configurações, categorias, coberturas, benefícios e usuários |

### Auditoria

Toda alteração em cliente, veículo, simulação, cadastro e nos cadastros base cai
em `crm_logs`, com usuário, data e **apenas os campos que mudaram de fato** — um
UPDATE que não altera nada não polui o log.

## Mapa dos arquivos

```
supabase/migrations/20260731000100_crm_protecao_veicular.sql   schema, RLS, RPCs, seeds

src/lib/crm/
  types.ts        tipos espelhando as tabelas
  format.ts       moeda, placa, CPF/CNPJ, telefone, datas (pt-BR)
  calc.ts         cálculo do mensal, categoria por valor, validações
  queries.ts      acesso a dados (Supabase)
  pdf/
    documento-proposta.tsx   layout do PDF
    gerar.ts                 renderiza, baixa e arquiva
    link.ts                  link público (módulo leve, sem react-pdf)

src/components/crm/
  provedor-crm.tsx         contexto: usuário + cadastros base
  barra-lateral.tsx        menu lateral recolhível
  cabecalho.tsx            topo + busca global
  formulario-simulacao.tsx wizard de 4 etapas (criar e editar)
  campo-moeda.tsx          input de dinheiro pt-BR
  etiquetas.tsx            badges de status/situação/categoria

src/app/crm/               telas do CRM
src/app/proposta/[token]/  página pública da proposta
```

## O que ainda não está pronto

Entregue nesta fase: dashboard, simulações (criar / listar / ver / editar /
duplicar / excluir / confirmar), PDF com arquivamento e versionamento, clientes
com cadastro definitivo PF/PJ, veículos, cadastros, PDFs gerados, relatório por
período com exportação CSV, configurações e usuários.

Ainda **não** implementado (backlog):

- Upload de documentos (CRLV, CNH, contrato social, fotos) — a tabela
  `crm_documentos` e o bucket já existem, falta a tela.
- Lembretes de vencimento de adesão e renovação.
- Relatórios por cliente/veículo e exportação em PDF (hoje só CSV, por período).
- Integrações: consulta FIPE, leitura automática de placa, assinatura
  eletrônica, gateway de pagamento, envio de SMS/WhatsApp automático.
- Tela de consulta do log de auditoria (os dados já estão sendo gravados).
