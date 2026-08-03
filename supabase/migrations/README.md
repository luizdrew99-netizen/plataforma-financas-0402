# Migrações do CRM da ABPAC

O banco fica no projeto Supabase **`pgycjyrcjxtjptcfxzvx`** (`ABPAC`), e é a
fonte da verdade. O histórico aplicado lá é:

| Versão | Nome | Origem |
|---|---|---|
| `20260723013116` | `crm_protecao_veicular_schema_inicial` | sistema anterior — tabelas, enums, RLS, funções base |
| `20260723013130` | `crm_protecao_veicular_storage` | sistema anterior — buckets `documentos`, `logos`, `propostas` |
| `20260731034626` | `crm_complementos_app_novo` | este app — colunas novas, view, RPCs |
| `20260731040306` | `crm_total_mensal_com_extras` | este app — correção da coluna gerada |
| `20260803205547` | `crm_identidade_publica` | este app — nome e logo para a tela de login |

As duas primeiras foram criadas pelo sistema anterior e **não** estão
versionadas aqui; para obtê-las, use `supabase db pull` ou copie de
`supabase_migrations.schema_migrations` no SQL Editor.

As duas últimas são deste app e estão consolidadas em
`20260731034626_crm_complementos_app_novo.sql` — o arquivo reflete o **estado
final** das duas, para poder ser reaplicado de uma vez num banco novo. Ele é
idempotente (`add column if not exists`, `create or replace`), então rodar de
novo num banco que já as tem não quebra nada.

## O que essas migrações fazem

**Colunas acrescentadas** (nada foi removido nem renomeado):

- `configuracoes`: `endereco`, `site`, `observacoes_padrao`, `assinatura_nome`,
  `assinatura_cargo` — todas saem impressas na proposta.
- `coberturas` e `beneficios`: `padrao` — se o item já vem marcado numa
  simulação nova.
- `simulacoes`: `valor_beneficios_extras` — soma dos benefícios que o admin
  cadastrar além dos dois padrão.
- `contratos`: `numero` (com sequência e trigger, no formato `CTR-2026-000001`),
  `valor_protecao`, `dia_vencimento`, `observacoes`; e a policy de exclusão que
  faltava.

**`total_mensal` recriada.** A expressão original somava só
`rateio + terceiros + assistência`. Como agora existe um terceiro benefício
possível, o valor dele ficaria fora do total gravado — a tela mostraria um
número e o banco guardaria outro. Postgres não permite alterar a expressão de
uma coluna gerada, então ela foi recriada incluindo `valor_beneficios_extras`
(sem perda de dados: o valor é derivado).

**Objetos novos:**

- `simulacoes_detalhe` — view com simulação + cliente + veículo + categoria +
  contrato, usada por toda listagem.
- `salvar_simulacao(jsonb)` — cria/atualiza cliente + veículo + simulação numa
  transação só e monta o snapshot dentro do banco.
- `confirmar_simulacao(uuid)` — confirma e cria o contrato no mesmo passo.
- `duplicar_simulacao(uuid)` — copia simulação e veículo, como rascunho.
- `dashboard_resumo()` — todos os indicadores em uma chamada.
- `busca_global(text)` — nome, CPF, CNPJ, placa, marca, modelo, telefone.
- `identidade_publica()` — nome e logo da associação, para a tela de login, que
  roda sem sessão. `configuracoes` continua legível só por usuário autenticado:
  esta função é `security definer` e devolve **apenas esses dois campos**, os
  mesmos que já apareciam na página pública da proposta. CNPJ, telefone,
  e-mail e endereço não saem por ela.

## Aproveitado do sistema anterior (não recriado)

`proposta_publica`, `categoria_por_valor`, `gerar_numero_simulacao`,
`verificar_lacunas_categorias`, `registrar_auditoria`, `tocar_updated_at`,
`handle_new_user`, `meu_papel`, `e_admin`, `e_gestor` — além de toda a RLS e
dos três buckets.
