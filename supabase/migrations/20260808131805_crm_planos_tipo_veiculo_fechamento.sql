-- ETAPA 1 das mudanças pedidas pelo Luiz. Tudo aqui é ADITIVO: nenhuma coluna
-- ou função existente muda de comportamento, então o sistema em uso continua
-- funcionando igual enquanto a etapa 2 (vários veículos por cotação) é feita.

-- ------------------------------------------------------------------ veículo
-- "Rebocadores e caminhões têm benefícios; carretas não." A regra precisa de
-- um tipo no veículo. O padrão é `caminhao` para não mexer no que já existe.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_veiculo') then
    create type tipo_veiculo as enum ('cavalo', 'caminhao', 'carreta');
  end if;
end $$;

alter table public.veiculos
  add column if not exists tipo tipo_veiculo not null default 'caminhao';

comment on column public.veiculos.tipo is
  'cavalo (rebocador) e caminhao aceitam benefícios; carreta não.';

-- ----------------------------------------------------------------- planos
-- Hoje cada benefício tem UM valor fixo. Passam a ter planos: o consultor
-- escolhe qual, e o preço vem do plano escolhido.
create table if not exists public.beneficio_planos (
  id            uuid primary key default gen_random_uuid(),
  beneficio_id  uuid not null references public.beneficios(id) on delete cascade,
  codigo        text not null,
  nome          text not null,
  descricao     text,
  valor         numeric(12,2) not null check (valor >= 0),
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (beneficio_id, codigo)
);

create index if not exists idx_beneficio_planos_beneficio
  on public.beneficio_planos (beneficio_id, ordem);

drop trigger if exists trg_upd_beneficio_planos on public.beneficio_planos;
create trigger trg_upd_beneficio_planos
  before update on public.beneficio_planos
  for each row execute function public.tocar_updated_at();

alter table public.beneficio_planos enable row level security;

-- Mesma regra dos benefícios: todo mundo lê, só admin escreve.
drop policy if exists p_planos_select on public.beneficio_planos;
create policy p_planos_select on public.beneficio_planos
  for select to authenticated using (true);

drop policy if exists p_planos_all on public.beneficio_planos;
create policy p_planos_all on public.beneficio_planos
  for all to authenticated using (public.e_admin()) with check (public.e_admin());

-- ------------------------------------------------------------- fechamento
-- "Marcar a cotação que for fechada" — marcação simples, sem criar contrato.
-- O contrato continua sendo um passo separado, por `confirmar_simulacao`.
alter table public.simulacoes
  add column if not exists fechada_em  timestamptz,
  add column if not exists fechada_por uuid references public.profiles(id);

comment on column public.simulacoes.fechada_em is
  'Quando o consultor marcou a cotação como fechada. Não cria contrato.';

-- ---------------------------------------------------------- configurações
alter table public.configuracoes
  add column if not exists telefone_24h text,
  add column if not exists participacao_acionamento_percentual numeric(5,2) not null default 2.5,
  add column if not exists depreciacao_restricao_percentual    numeric(5,2) not null default 30;

comment on column public.configuracoes.participacao_acionamento_percentual is
  'Participação do associado no acionamento, em % do valor de mercado na época do evento.';
comment on column public.configuracoes.depreciacao_restricao_percentual is
  'Depreciação aplicada a veículo com leilão, chassi remarcado, recuperado de sinistro ou pequena/média monta.';
