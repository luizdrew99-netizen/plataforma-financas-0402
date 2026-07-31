-- =====================================================================
-- CRM de Proteção Veicular para Caminhões
-- =====================================================================
-- Cria todo o núcleo do CRM no schema `public` com prefixo `crm_`, para
-- conviver sem colisão com as tabelas do app de finanças que já existem
-- neste mesmo projeto Supabase.
--
-- Contém: usuários/papéis, configurações da empresa, categorias por faixa
-- de valor, coberturas, benefícios, clientes, veículos, simulações,
-- cadastros definitivos, PDFs, documentos e log de auditoria.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type crm_papel as enum ('admin', 'supervisor', 'consultor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crm_tipo_pessoa as enum ('fisica', 'juridica');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crm_status_simulacao as enum (
    'rascunho', 'gerada', 'enviada', 'confirmada', 'cancelada'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type crm_situacao_cadastro as enum (
    'ativo', 'pendente', 'cancelado', 'inadimplente', 'suspenso'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------

-- Mantém updated_at sempre coerente sem depender da aplicação.
create or replace function public.crm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Usuários do CRM
-- ---------------------------------------------------------------------
create table if not exists public.crm_usuarios (
  id           uuid primary key references auth.users(id) on delete cascade,
  nome         text,
  email        text,
  papel        crm_papel   not null default 'consultor',
  ativo        boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_crm_usuarios_updated on public.crm_usuarios;
create trigger trg_crm_usuarios_updated before update on public.crm_usuarios
  for each row execute function public.crm_touch_updated_at();

-- Helpers de autorização. SECURITY DEFINER porque são usados dentro das
-- próprias policies de crm_usuarios — sem isso a checagem recursaria na RLS.
create or replace function public.crm_usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.crm_usuarios u
    where u.id = auth.uid() and u.ativo
  );
$$;

create or replace function public.crm_tem_papel(p_papeis crm_papel[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.crm_usuarios u
    where u.id = auth.uid() and u.ativo and u.papel = any(p_papeis)
  );
$$;

-- Auto-provisionamento: o primeiro usuário que entrar no CRM vira admin,
-- os seguintes entram como consultor. Chamada pelo layout do /crm.
create or replace function public.crm_garantir_usuario()
returns public.crm_usuarios
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.crm_usuarios;
  v_papel crm_papel;
begin
  if v_uid is null then
    raise exception 'Sem sessão autenticada.';
  end if;

  select * into v_row from public.crm_usuarios where id = v_uid;
  if found then
    return v_row;
  end if;

  select case when count(*) = 0 then 'admin' else 'consultor' end
    into v_papel
    from public.crm_usuarios;

  insert into public.crm_usuarios (id, nome, email, papel)
  select v_uid,
         coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
         u.email,
         v_papel
    from auth.users u
   where u.id = v_uid
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- Configurações da empresa (registro único)
-- ---------------------------------------------------------------------
create table if not exists public.crm_configuracoes (
  id                    boolean primary key default true check (id),
  nome_empresa          text        not null default 'Associação de Proteção Veicular',
  cnpj                  text,
  logo_url              text,
  telefone              text,
  whatsapp              text,
  email                 text,
  endereco              text,
  site                  text,
  rodape_pdf            text        not null default
    'Este documento é uma simulação e não representa contrato de seguro. '
    'Proteção veicular prestada em regime de associação/rateio entre associados.',
  observacoes_padrao    text,
  taxa_adesao_padrao    numeric(12,2) not null default 400,
  validade_proposta_dias integer      not null default 7,
  assinatura_nome       text,
  assinatura_cargo      text,
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_crm_config_updated on public.crm_configuracoes;
create trigger trg_crm_config_updated before update on public.crm_configuracoes
  for each row execute function public.crm_touch_updated_at();

insert into public.crm_configuracoes (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Categorias (faixas de valor de mercado)
-- ---------------------------------------------------------------------
create table if not exists public.crm_categorias (
  id          uuid primary key default gen_random_uuid(),
  codigo      text        not null unique,
  nome        text        not null,
  valor_min   numeric(14,2) not null default 0,
  valor_max   numeric(14,2),                   -- null = sem teto
  rateio_sugerido numeric(12,2),
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint crm_categorias_faixa_valida
    check (valor_max is null or valor_max >= valor_min)
);

drop trigger if exists trg_crm_categorias_updated on public.crm_categorias;
create trigger trg_crm_categorias_updated before update on public.crm_categorias
  for each row execute function public.crm_touch_updated_at();

-- Faixas do documento base, tornadas contíguas: o texto original deixava
-- buracos (100.000 -> 101.000), o que faria um veículo de R$ 100.500 ficar
-- sem categoria. Aqui cada faixa começa 1 centavo depois do teto anterior.
insert into public.crm_categorias (codigo, nome, valor_min, valor_max, rateio_sugerido, ordem) values
  ('R1', 'Categoria R1', 0,           100000.00, null, 1),
  ('R2', 'Categoria R2', 100000.01,   150000.00, null, 2),
  ('R3', 'Categoria R3', 150000.01,   250000.00, null, 3),
  ('R4', 'Categoria R4', 250000.01,   350000.00, 970, 4),
  ('R5', 'Categoria R5', 350000.01,   null,      null, 5)
on conflict (codigo) do nothing;

-- Resolve a categoria a partir do valor de mercado. Se o valor cair em um
-- vão entre faixas (configuração manual do admin), devolve a faixa mais
-- próxima por baixo, e nunca deixa a simulação sem categoria.
create or replace function public.crm_categoria_por_valor(p_valor numeric)
returns uuid
language sql
stable
as $$
  with exata as (
    select id, ordem from public.crm_categorias
     where ativo
       and p_valor >= valor_min
       and (valor_max is null or p_valor <= valor_max)
     order by ordem
     limit 1
  ), aproximada as (
    select id from public.crm_categorias
     where ativo and valor_min <= p_valor
     order by valor_min desc
     limit 1
  ), primeira as (
    select id from public.crm_categorias where ativo order by ordem limit 1
  )
  select coalesce(
    (select id from exata),
    (select id from aproximada),
    (select id from primeira)
  );
$$;

-- ---------------------------------------------------------------------
-- Coberturas
-- ---------------------------------------------------------------------
create table if not exists public.crm_coberturas (
  id          uuid primary key default gen_random_uuid(),
  nome        text        not null,
  descricao   text,
  ordem       integer     not null default 0,
  padrao      boolean     not null default true,  -- vem marcada na simulação nova
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_crm_coberturas_updated on public.crm_coberturas;
create trigger trg_crm_coberturas_updated before update on public.crm_coberturas
  for each row execute function public.crm_touch_updated_at();

insert into public.crm_coberturas (nome, ordem)
select nome, ordem from (values
  ('Colisão', 1),
  ('Fenômenos da Natureza', 2),
  ('Incêndio', 3),
  ('Roubo', 4),
  ('Furto', 5),
  ('APP + Funeral', 6),
  ('Atendimento Médico ao Motorista', 7),
  ('Destombamento', 8),
  ('Içamento', 9),
  ('Instalação gratuita dos equipamentos de segurança', 10),
  ('Acesso ao localizador', 11)
) as t(nome, ordem)
where not exists (select 1 from public.crm_coberturas);

-- ---------------------------------------------------------------------
-- Benefícios (blocos com texto longo + valor editável)
-- ---------------------------------------------------------------------
create table if not exists public.crm_beneficios (
  id            uuid primary key default gen_random_uuid(),
  chave         text        not null unique,
  titulo        text        not null,
  descricao     text        not null,
  valor_padrao  numeric(12,2) not null default 0,
  ordem         integer     not null default 0,
  padrao        boolean     not null default true,
  ativo         boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_crm_beneficios_updated on public.crm_beneficios;
create trigger trg_crm_beneficios_updated before update on public.crm_beneficios
  for each row execute function public.crm_touch_updated_at();

insert into public.crm_beneficios (chave, titulo, descricao, valor_padrao, ordem) values
  (
    'protecao_terceiros',
    'Proteção para Terceiros',
    E'Cobertura:\n'
    E'• R$ 300.000,00 para danos materiais\n'
    E'• R$ 150.000,00 para danos corporais\n'
    E'• R$ 30.000,00 para danos morais\n\n'
    E'Participação do associado:\n'
    E'• 1º acionamento: R$ 1.000,00\n'
    E'• 2º acionamento: R$ 2.000,00\n'
    E'• 3º acionamento: R$ 4.000,00\n\n'
    E'Após completar 1 ano, a participação reinicia em R$ 1.000,00.',
    237,
    1
  ),
  (
    'assistencia_24h',
    'Assistência 24 Horas',
    E'• Guincho: 500 km de ida e 500 km de volta\n'
    E'• Mecânico / Eletricista: até R$ 500,00\n'
    E'• Chaveiro: até R$ 150,00\n'
    E'• Borracheiro: até R$ 300,00\n'
    E'• Carga lenta de bateria: até R$ 200,00\n'
    E'• Troca de para-brisa sem sensor: participação de R$ 350,00\n'
    E'• Troca de para-brisa com sensor: participação de R$ 500,00\n'
    E'• Vidros laterais: participação de R$ 100,00',
    195,
    2
  )
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table if not exists public.crm_clientes (
  id                 uuid primary key default gen_random_uuid(),
  tipo_pessoa        crm_tipo_pessoa not null default 'fisica',

  -- comuns / pessoa física
  nome               text not null,
  cpf                text,
  rg                 text,
  cnh                text,
  data_nascimento    date,

  -- pessoa jurídica
  razao_social       text,
  nome_fantasia      text,
  cnpj               text,
  inscricao_estadual text,
  responsavel        text,
  cpf_responsavel    text,

  -- contato
  telefone           text,
  whatsapp           text,
  email              text,

  -- endereço
  cep                text,
  endereco           text,
  numero             text,
  complemento        text,
  bairro             text,
  cidade             text,
  estado             text,

  observacoes        text,
  criado_por         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_crm_clientes_updated on public.crm_clientes;
create trigger trg_crm_clientes_updated before update on public.crm_clientes
  for each row execute function public.crm_touch_updated_at();

create index if not exists idx_crm_clientes_nome     on public.crm_clientes using gin (to_tsvector('simple', nome));
create index if not exists idx_crm_clientes_cpf      on public.crm_clientes (cpf);
create index if not exists idx_crm_clientes_cnpj     on public.crm_clientes (cnpj);
create index if not exists idx_crm_clientes_telefone on public.crm_clientes (telefone);

-- ---------------------------------------------------------------------
-- Veículos
-- ---------------------------------------------------------------------
create table if not exists public.crm_veiculos (
  id                    uuid primary key default gen_random_uuid(),
  cliente_id            uuid references public.crm_clientes(id) on delete cascade,
  placa                 text not null,
  marca                 text,
  modelo                text,
  ano_modelo            integer,
  ano_fabricacao        integer,
  chassi                text,
  renavam               text,
  cor                   text,
  valor_mercado         numeric(14,2) not null default 0,
  categoria_id          uuid references public.crm_categorias(id) on delete set null,
  tipo_veiculo          text not null default 'caminhao',  -- pronto p/ ônibus, implemento, carro

  -- restrições declaradas (leilão, sinistro, monta, chassi remarcado…)
  restricoes            jsonb not null default '[]'::jsonb,
  restricoes_descricao  text,

  observacoes           text,
  criado_por            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_crm_veiculos_updated on public.crm_veiculos;
create trigger trg_crm_veiculos_updated before update on public.crm_veiculos
  for each row execute function public.crm_touch_updated_at();

create index if not exists idx_crm_veiculos_placa   on public.crm_veiculos (upper(placa));
create index if not exists idx_crm_veiculos_cliente on public.crm_veiculos (cliente_id);

-- Normaliza a placa e resolve a categoria automaticamente pelo valor.
create or replace function public.crm_veiculo_before_write()
returns trigger
language plpgsql
as $$
begin
  new.placa := upper(regexp_replace(coalesce(new.placa, ''), '[^A-Za-z0-9]', '', 'g'));

  if new.categoria_id is null
     or tg_op = 'INSERT'
     or new.valor_mercado is distinct from old.valor_mercado then
    new.categoria_id := coalesce(
      public.crm_categoria_por_valor(new.valor_mercado),
      new.categoria_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_veiculos_before_write on public.crm_veiculos;
create trigger trg_crm_veiculos_before_write before insert or update on public.crm_veiculos
  for each row execute function public.crm_veiculo_before_write();

-- ---------------------------------------------------------------------
-- Simulações
-- ---------------------------------------------------------------------
create sequence if not exists public.crm_simulacao_numero_seq start 1;

create table if not exists public.crm_simulacoes (
  id                      uuid primary key default gen_random_uuid(),
  numero                  bigint not null default nextval('public.crm_simulacao_numero_seq') unique,

  cliente_id              uuid not null references public.crm_clientes(id) on delete restrict,
  veiculo_id              uuid not null references public.crm_veiculos(id)  on delete restrict,
  categoria_id            uuid references public.crm_categorias(id) on delete set null,

  valor_mercado           numeric(14,2) not null default 0,
  valor_rateio            numeric(12,2) not null default 0,
  valor_protecao_terceiros numeric(12,2) not null default 0,
  valor_assistencia       numeric(12,2) not null default 0,
  -- soma dos benefícios que o admin cadastrar além dos dois padrão
  valor_beneficios_extras numeric(12,2) not null default 0,
  taxa_adesao             numeric(12,2) not null default 0,

  -- rateio + terceiros + assistência + extras; a taxa de adesão é à parte
  valor_mensal numeric(12,2)
    generated always as (
      valor_rateio + valor_protecao_terceiros + valor_assistencia + valor_beneficios_extras
    ) stored,

  -- fotografia do que foi vendido, para o PDF não mudar se o cadastro mudar
  coberturas_snapshot     jsonb not null default '[]'::jsonb,
  beneficios_snapshot     jsonb not null default '[]'::jsonb,

  observacoes             text,
  status                  crm_status_simulacao not null default 'rascunho',
  token_publico           uuid not null default gen_random_uuid() unique,

  confirmada_em           timestamptz,
  criado_por              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint crm_simulacoes_valores_nao_negativos check (
    valor_mercado >= 0 and valor_rateio >= 0 and valor_protecao_terceiros >= 0
    and valor_assistencia >= 0 and valor_beneficios_extras >= 0 and taxa_adesao >= 0
  )
);

drop trigger if exists trg_crm_simulacoes_updated on public.crm_simulacoes;
create trigger trg_crm_simulacoes_updated before update on public.crm_simulacoes
  for each row execute function public.crm_touch_updated_at();

create index if not exists idx_crm_simulacoes_cliente on public.crm_simulacoes (cliente_id);
create index if not exists idx_crm_simulacoes_veiculo on public.crm_simulacoes (veiculo_id);
create index if not exists idx_crm_simulacoes_status  on public.crm_simulacoes (status);
create index if not exists idx_crm_simulacoes_data    on public.crm_simulacoes (created_at desc);

create or replace function public.crm_simulacao_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.categoria_id is null then
    new.categoria_id := public.crm_categoria_por_valor(new.valor_mercado);
  end if;

  if new.status = 'confirmada' and new.confirmada_em is null then
    new.confirmada_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_simulacoes_before_write on public.crm_simulacoes;
create trigger trg_crm_simulacoes_before_write before insert or update on public.crm_simulacoes
  for each row execute function public.crm_simulacao_before_write();

-- ---------------------------------------------------------------------
-- Cadastro definitivo (simulação confirmada vira contrato)
-- ---------------------------------------------------------------------
create sequence if not exists public.crm_cadastro_numero_seq start 1;

create table if not exists public.crm_cadastros (
  id                 uuid primary key default gen_random_uuid(),
  numero             bigint not null default nextval('public.crm_cadastro_numero_seq') unique,
  simulacao_id       uuid unique references public.crm_simulacoes(id) on delete set null,
  cliente_id         uuid not null references public.crm_clientes(id) on delete restrict,
  veiculo_id         uuid not null references public.crm_veiculos(id) on delete restrict,

  situacao           crm_situacao_cadastro not null default 'pendente',
  valor_protecao     numeric(14,2) not null default 0,
  valor_mensal       numeric(12,2) not null default 0,
  taxa_adesao        numeric(12,2) not null default 0,
  data_contratacao   date not null default current_date,
  data_vencimento    date,
  dia_vencimento     integer check (dia_vencimento between 1 and 31),

  observacoes        text,
  criado_por         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_crm_cadastros_updated on public.crm_cadastros;
create trigger trg_crm_cadastros_updated before update on public.crm_cadastros
  for each row execute function public.crm_touch_updated_at();

create index if not exists idx_crm_cadastros_situacao on public.crm_cadastros (situacao);
create index if not exists idx_crm_cadastros_cliente  on public.crm_cadastros (cliente_id);

-- Confirma a simulação e cria (ou devolve) o cadastro definitivo, em uma
-- transação só, para não existir simulação confirmada sem contrato.
create or replace function public.crm_confirmar_simulacao(p_simulacao_id uuid)
returns public.crm_cadastros
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim public.crm_simulacoes;
  v_cad public.crm_cadastros;
begin
  select * into v_sim from public.crm_simulacoes where id = p_simulacao_id;
  if not found then
    raise exception 'Simulação % não encontrada.', p_simulacao_id;
  end if;

  select * into v_cad from public.crm_cadastros where simulacao_id = p_simulacao_id;
  if found then
    return v_cad;
  end if;

  update public.crm_simulacoes
     set status = 'confirmada', confirmada_em = coalesce(confirmada_em, now())
   where id = p_simulacao_id;

  insert into public.crm_cadastros (
    simulacao_id, cliente_id, veiculo_id, situacao,
    valor_protecao, valor_mensal, taxa_adesao, criado_por
  ) values (
    v_sim.id, v_sim.cliente_id, v_sim.veiculo_id, 'pendente',
    v_sim.valor_mercado, v_sim.valor_mensal, v_sim.taxa_adesao, auth.uid()
  ) returning * into v_cad;

  return v_cad;
end;
$$;

-- ---------------------------------------------------------------------
-- PDFs gerados (histórico versionado)
-- ---------------------------------------------------------------------
create table if not exists public.crm_pdfs (
  id            uuid primary key default gen_random_uuid(),
  simulacao_id  uuid not null references public.crm_simulacoes(id) on delete cascade,
  versao        integer not null default 1,
  arquivo_path  text not null,
  tamanho_bytes integer,
  gerado_por    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (simulacao_id, versao)
);

create index if not exists idx_crm_pdfs_simulacao on public.crm_pdfs (simulacao_id, versao desc);

-- Numera a versão sozinho: cada regeração vira uma versão nova.
create or replace function public.crm_pdf_before_insert()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(versao), 0) + 1 into new.versao
    from public.crm_pdfs where simulacao_id = new.simulacao_id;
  return new;
end;
$$;

drop trigger if exists trg_crm_pdfs_before_insert on public.crm_pdfs;
create trigger trg_crm_pdfs_before_insert before insert on public.crm_pdfs
  for each row execute function public.crm_pdf_before_insert();

-- ---------------------------------------------------------------------
-- Documentos anexados (CRLV, CNH, contrato social, fotos…)
-- ---------------------------------------------------------------------
create table if not exists public.crm_documentos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.crm_clientes(id)   on delete cascade,
  veiculo_id    uuid references public.crm_veiculos(id)   on delete cascade,
  simulacao_id  uuid references public.crm_simulacoes(id) on delete cascade,
  tipo          text not null default 'outro',
  nome          text not null,
  arquivo_path  text not null,
  tamanho_bytes integer,
  enviado_por   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint crm_documentos_tem_dono check (
    cliente_id is not null or veiculo_id is not null or simulacao_id is not null
  )
);

-- ---------------------------------------------------------------------
-- Log de auditoria
-- ---------------------------------------------------------------------
create table if not exists public.crm_logs (
  id          bigserial primary key,
  tabela      text not null,
  registro_id text,
  acao        text not null,
  alteracoes  jsonb,
  usuario_id  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists idx_crm_logs_registro on public.crm_logs (tabela, registro_id, created_at desc);
create index if not exists idx_crm_logs_data     on public.crm_logs (created_at desc);

-- Grava só o que mudou de fato — um UPDATE que não altera nada não polui o log.
create or replace function public.crm_audita()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_alteracoes jsonb;
  v_id         text;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old)->>'id');
    insert into public.crm_logs (tabela, registro_id, acao, alteracoes, usuario_id)
    values (tg_table_name, v_id, 'DELETE', to_jsonb(old), auth.uid());
    return old;
  end if;

  v_id := (to_jsonb(new)->>'id');

  if tg_op = 'INSERT' then
    insert into public.crm_logs (tabela, registro_id, acao, alteracoes, usuario_id)
    values (tg_table_name, v_id, 'INSERT', to_jsonb(new), auth.uid());
    return new;
  end if;

  select jsonb_object_agg(
           chave,
           jsonb_build_object('de', to_jsonb(old)->chave, 'para', to_jsonb(new)->chave)
         )
    into v_alteracoes
    from jsonb_object_keys(to_jsonb(new)) as chave
   where to_jsonb(new)->chave is distinct from to_jsonb(old)->chave
     and chave <> 'updated_at';

  if v_alteracoes is not null then
    insert into public.crm_logs (tabela, registro_id, acao, alteracoes, usuario_id)
    values (tg_table_name, v_id, 'UPDATE', v_alteracoes, auth.uid());
  end if;

  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'crm_clientes', 'crm_veiculos', 'crm_simulacoes', 'crm_cadastros',
    'crm_categorias', 'crm_coberturas', 'crm_beneficios', 'crm_configuracoes'
  ] loop
    execute format('drop trigger if exists trg_%1$s_audit on public.%1$I', t);
    execute format(
      'create trigger trg_%1$s_audit after insert or update or delete on public.%1$I
         for each row execute function public.crm_audita()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.crm_usuarios      enable row level security;
alter table public.crm_configuracoes enable row level security;
alter table public.crm_categorias    enable row level security;
alter table public.crm_coberturas    enable row level security;
alter table public.crm_beneficios    enable row level security;
alter table public.crm_clientes      enable row level security;
alter table public.crm_veiculos      enable row level security;
alter table public.crm_simulacoes    enable row level security;
alter table public.crm_cadastros     enable row level security;
alter table public.crm_pdfs          enable row level security;
alter table public.crm_documentos    enable row level security;
alter table public.crm_logs          enable row level security;

-- Usuários: cada um se vê; admin vê e administra todos.
drop policy if exists crm_usuarios_select on public.crm_usuarios;
create policy crm_usuarios_select on public.crm_usuarios for select to authenticated
  using (id = auth.uid() or public.crm_tem_papel(array['admin','supervisor']::crm_papel[]));

drop policy if exists crm_usuarios_admin_write on public.crm_usuarios;
create policy crm_usuarios_admin_write on public.crm_usuarios for all to authenticated
  using (public.crm_tem_papel(array['admin']::crm_papel[]))
  with check (public.crm_tem_papel(array['admin']::crm_papel[]));

-- Tabelas de cadastro base: todo usuário ativo lê; só admin escreve.
do $$
declare t text;
begin
  foreach t in array array['crm_configuracoes','crm_categorias','crm_coberturas','crm_beneficios'] loop
    execute format('drop policy if exists %1$s_leitura on public.%1$I', t);
    execute format(
      'create policy %1$s_leitura on public.%1$I for select to authenticated
         using (public.crm_usuario_ativo())', t);

    execute format('drop policy if exists %1$s_escrita_admin on public.%1$I', t);
    execute format(
      'create policy %1$s_escrita_admin on public.%1$I for all to authenticated
         using (public.crm_tem_papel(array[''admin'']::crm_papel[]))
         with check (public.crm_tem_papel(array[''admin'']::crm_papel[]))', t);
  end loop;
end $$;

-- Dados operacionais: usuário ativo lê e escreve; exclusão só admin/supervisor.
do $$
declare t text;
begin
  foreach t in array array[
    'crm_clientes','crm_veiculos','crm_simulacoes','crm_cadastros','crm_pdfs','crm_documentos'
  ] loop
    execute format('drop policy if exists %1$s_leitura on public.%1$I', t);
    execute format(
      'create policy %1$s_leitura on public.%1$I for select to authenticated
         using (public.crm_usuario_ativo())', t);

    execute format('drop policy if exists %1$s_insercao on public.%1$I', t);
    execute format(
      'create policy %1$s_insercao on public.%1$I for insert to authenticated
         with check (public.crm_usuario_ativo())', t);

    execute format('drop policy if exists %1$s_atualizacao on public.%1$I', t);
    execute format(
      'create policy %1$s_atualizacao on public.%1$I for update to authenticated
         using (public.crm_usuario_ativo()) with check (public.crm_usuario_ativo())', t);

    execute format('drop policy if exists %1$s_exclusao on public.%1$I', t);
    execute format(
      'create policy %1$s_exclusao on public.%1$I for delete to authenticated
         using (public.crm_tem_papel(array[''admin'',''supervisor'']::crm_papel[]))', t);
  end loop;
end $$;

-- Log: só leitura, e só para quem supervisiona. Escrita é do trigger.
drop policy if exists crm_logs_leitura on public.crm_logs;
create policy crm_logs_leitura on public.crm_logs for select to authenticated
  using (public.crm_tem_papel(array['admin','supervisor']::crm_papel[]));

-- ---------------------------------------------------------------------
-- Storage: bucket privado para PDFs e documentos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('crm-arquivos', 'crm-arquivos', false)
on conflict (id) do nothing;

drop policy if exists crm_arquivos_leitura on storage.objects;
create policy crm_arquivos_leitura on storage.objects for select to authenticated
  using (bucket_id = 'crm-arquivos' and public.crm_usuario_ativo());

drop policy if exists crm_arquivos_envio on storage.objects;
create policy crm_arquivos_envio on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-arquivos' and public.crm_usuario_ativo());

drop policy if exists crm_arquivos_atualizacao on storage.objects;
create policy crm_arquivos_atualizacao on storage.objects for update to authenticated
  using (bucket_id = 'crm-arquivos' and public.crm_usuario_ativo());

drop policy if exists crm_arquivos_exclusao on storage.objects;
create policy crm_arquivos_exclusao on storage.objects for delete to authenticated
  using (bucket_id = 'crm-arquivos'
         and public.crm_tem_papel(array['admin','supervisor']::crm_papel[]));

-- ---------------------------------------------------------------------
-- Visões de apoio ao dashboard e à busca
-- ---------------------------------------------------------------------
create or replace view public.crm_simulacoes_detalhe
with (security_invoker = true) as
select
  s.*,
  c.nome            as cliente_nome,
  c.telefone        as cliente_telefone,
  c.cidade          as cliente_cidade,
  c.estado          as cliente_estado,
  v.placa           as veiculo_placa,
  v.marca           as veiculo_marca,
  v.modelo          as veiculo_modelo,
  v.ano_modelo      as veiculo_ano_modelo,
  v.ano_fabricacao  as veiculo_ano_fabricacao,
  v.restricoes           as veiculo_restricoes,
  v.restricoes_descricao as veiculo_restricoes_descricao,
  cat.codigo        as categoria_codigo,
  cat.nome          as categoria_nome,
  cat.valor_min     as categoria_valor_min,
  cat.valor_max     as categoria_valor_max,
  cad.id            as cadastro_id,
  cad.numero        as cadastro_numero,
  cad.situacao      as cadastro_situacao
from public.crm_simulacoes s
join public.crm_clientes   c   on c.id   = s.cliente_id
join public.crm_veiculos   v   on v.id   = s.veiculo_id
left join public.crm_categorias cat on cat.id = s.categoria_id
left join public.crm_cadastros  cad on cad.simulacao_id = s.id;

-- Indicadores do dashboard em uma chamada só.
create or replace function public.crm_dashboard_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'total_simulacoes',   (select count(*) from public.crm_simulacoes),
    'simulacoes_hoje',    (select count(*) from public.crm_simulacoes
                            where created_at >= date_trunc('day', now())),
    'simulacoes_mes',     (select count(*) from public.crm_simulacoes
                            where created_at >= date_trunc('month', now())),
    'cadastros_confirmados', (select count(*) from public.crm_simulacoes
                               where status = 'confirmada'),
    'valor_medio',        (select coalesce(round(avg(valor_mensal), 2), 0)
                             from public.crm_simulacoes),
    'ticket_total_mes',   (select coalesce(sum(valor_mensal), 0) from public.crm_simulacoes
                            where status = 'confirmada'
                              and created_at >= date_trunc('month', now())),
    'total_clientes',     (select count(*) from public.crm_clientes),
    'total_veiculos',     (select count(*) from public.crm_veiculos),
    'serie_mensal',       (
      select coalesce(jsonb_agg(linha order by linha->>'mes'), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'mes',          to_char(m.mes, 'YYYY-MM'),
                   'simulacoes',   count(s.id),
                   'confirmadas',  count(s.id) filter (where s.status = 'confirmada'),
                   'valor',        coalesce(sum(s.valor_mensal), 0)
                 ) as linha
            from generate_series(
                   date_trunc('month', now()) - interval '11 months',
                   date_trunc('month', now()),
                   interval '1 month'
                 ) as m(mes)
            left join public.crm_simulacoes s
              on date_trunc('month', s.created_at) = m.mes
           group by m.mes
        ) t
    )
  );
$$;

-- Busca única por nome, CPF, CNPJ, placa, modelo, marca ou telefone.
create or replace function public.crm_busca(p_termo text)
returns table (
  tipo        text,
  id          uuid,
  titulo      text,
  subtitulo   text,
  referencia  uuid
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with termo as (
    select
      nullif(trim(p_termo), '')                                    as bruto,
      regexp_replace(coalesce(p_termo, ''), '[^A-Za-z0-9]', '', 'g') as limpo
  )
  select 'cliente', c.id, c.nome,
         coalesce(c.cidade || '/' || c.estado, c.telefone, c.email, ''), c.id
    from public.crm_clientes c, termo t
   where t.bruto is not null
     and (
       c.nome ilike '%' || t.bruto || '%'
       or coalesce(c.razao_social, '')  ilike '%' || t.bruto || '%'
       or coalesce(c.nome_fantasia, '') ilike '%' || t.bruto || '%'
       or (t.limpo <> '' and regexp_replace(coalesce(c.cpf, ''),      '[^0-9]', '', 'g') like '%' || t.limpo || '%')
       or (t.limpo <> '' and regexp_replace(coalesce(c.cnpj, ''),     '[^0-9]', '', 'g') like '%' || t.limpo || '%')
       or (t.limpo <> '' and regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g') like '%' || t.limpo || '%')
     )
  union all
  select 'veiculo', v.id,
         upper(v.placa) || ' — ' || coalesce(v.marca, '') || ' ' || coalesce(v.modelo, ''),
         coalesce(v.ano_modelo::text, ''), v.cliente_id
    from public.crm_veiculos v, termo t
   where t.bruto is not null
     and (
       (t.limpo <> '' and upper(v.placa) like '%' || upper(t.limpo) || '%')
       or coalesce(v.modelo, '') ilike '%' || t.bruto || '%'
       or coalesce(v.marca, '')  ilike '%' || t.bruto || '%'
       or coalesce(v.chassi, '') ilike '%' || t.bruto || '%'
     )
  limit 30;
$$;

-- ---------------------------------------------------------------------
-- Gravação da simulação em uma transação só
-- ---------------------------------------------------------------------
-- Cliente, veículo e simulação nascem juntos. Fazer isso em três chamadas
-- separadas do front deixaria cliente órfão sempre que a segunda falhasse.
-- Serve tanto para criar quanto para editar (basta mandar simulacao_id).
create or replace function public.crm_salvar_simulacao(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim_id     uuid := nullif(p_payload->>'simulacao_id', '')::uuid;
  v_cliente    jsonb := coalesce(p_payload->'cliente', '{}'::jsonb);
  v_veiculo    jsonb := coalesce(p_payload->'veiculo', '{}'::jsonb);
  v_cliente_id uuid  := nullif(v_cliente->>'id', '')::uuid;
  v_veiculo_id uuid  := nullif(v_veiculo->>'id', '')::uuid;
  v_existente  public.crm_simulacoes;
begin
  if v_sim_id is not null then
    select * into v_existente from public.crm_simulacoes where id = v_sim_id;
    if not found then
      raise exception 'Simulação % não encontrada.', v_sim_id;
    end if;
    v_cliente_id := coalesce(v_cliente_id, v_existente.cliente_id);
    v_veiculo_id := coalesce(v_veiculo_id, v_existente.veiculo_id);
  end if;

  -- Cliente
  if v_cliente_id is null then
    insert into public.crm_clientes (
      tipo_pessoa, nome, telefone, whatsapp, email,
      cidade, estado, observacoes, criado_por
    ) values (
      coalesce(nullif(v_cliente->>'tipo_pessoa',''), 'fisica')::crm_tipo_pessoa,
      coalesce(nullif(v_cliente->>'nome',''), 'Sem nome'),
      nullif(v_cliente->>'telefone',''),
      nullif(v_cliente->>'whatsapp',''),
      nullif(v_cliente->>'email',''),
      nullif(v_cliente->>'cidade',''),
      nullif(v_cliente->>'estado',''),
      nullif(v_cliente->>'observacoes',''),
      auth.uid()
    ) returning id into v_cliente_id;
  else
    update public.crm_clientes set
      nome        = coalesce(nullif(v_cliente->>'nome',''), nome),
      telefone    = coalesce(nullif(v_cliente->>'telefone',''), telefone),
      whatsapp    = coalesce(nullif(v_cliente->>'whatsapp',''), whatsapp),
      email       = coalesce(nullif(v_cliente->>'email',''), email),
      cidade      = coalesce(nullif(v_cliente->>'cidade',''), cidade),
      estado      = coalesce(nullif(v_cliente->>'estado',''), estado),
      observacoes = coalesce(nullif(v_cliente->>'observacoes',''), observacoes)
    where id = v_cliente_id;
  end if;

  -- Veículo (categoria e placa são normalizadas pelo trigger da tabela)
  if v_veiculo_id is null then
    insert into public.crm_veiculos (
      cliente_id, placa, marca, modelo, ano_modelo, ano_fabricacao,
      valor_mercado, restricoes, restricoes_descricao, observacoes, criado_por
    ) values (
      v_cliente_id,
      coalesce(nullif(v_veiculo->>'placa',''), ''),
      nullif(v_veiculo->>'marca',''),
      nullif(v_veiculo->>'modelo',''),
      nullif(v_veiculo->>'ano_modelo','')::integer,
      nullif(v_veiculo->>'ano_fabricacao','')::integer,
      coalesce((v_veiculo->>'valor_mercado')::numeric, 0),
      coalesce(v_veiculo->'restricoes', '[]'::jsonb),
      nullif(v_veiculo->>'restricoes_descricao',''),
      nullif(v_veiculo->>'observacoes',''),
      auth.uid()
    ) returning id into v_veiculo_id;
  else
    update public.crm_veiculos set
      cliente_id           = v_cliente_id,
      placa                = coalesce(nullif(v_veiculo->>'placa',''), placa),
      marca                = coalesce(nullif(v_veiculo->>'marca',''), marca),
      modelo               = coalesce(nullif(v_veiculo->>'modelo',''), modelo),
      ano_modelo           = coalesce(nullif(v_veiculo->>'ano_modelo','')::integer, ano_modelo),
      ano_fabricacao       = coalesce(nullif(v_veiculo->>'ano_fabricacao','')::integer, ano_fabricacao),
      valor_mercado        = coalesce((v_veiculo->>'valor_mercado')::numeric, valor_mercado),
      restricoes           = coalesce(v_veiculo->'restricoes', restricoes),
      restricoes_descricao = nullif(v_veiculo->>'restricoes_descricao',''),
      observacoes          = nullif(v_veiculo->>'observacoes','')
    where id = v_veiculo_id;
  end if;

  -- Simulação
  if v_sim_id is null then
    insert into public.crm_simulacoes (
      cliente_id, veiculo_id, valor_mercado, valor_rateio,
      valor_protecao_terceiros, valor_assistencia, valor_beneficios_extras,
      taxa_adesao, coberturas_snapshot, beneficios_snapshot, observacoes,
      status, criado_por
    ) values (
      v_cliente_id, v_veiculo_id,
      coalesce((p_payload->>'valor_mercado')::numeric, 0),
      coalesce((p_payload->>'valor_rateio')::numeric, 0),
      coalesce((p_payload->>'valor_protecao_terceiros')::numeric, 0),
      coalesce((p_payload->>'valor_assistencia')::numeric, 0),
      coalesce((p_payload->>'valor_beneficios_extras')::numeric, 0),
      coalesce((p_payload->>'taxa_adesao')::numeric, 0),
      coalesce(p_payload->'coberturas_snapshot', '[]'::jsonb),
      coalesce(p_payload->'beneficios_snapshot', '[]'::jsonb),
      nullif(p_payload->>'observacoes',''),
      coalesce(nullif(p_payload->>'status',''), 'gerada')::crm_status_simulacao,
      auth.uid()
    ) returning id into v_sim_id;
  else
    update public.crm_simulacoes set
      cliente_id               = v_cliente_id,
      veiculo_id               = v_veiculo_id,
      -- a categoria é recalculada porque o valor de mercado pode ter mudado
      categoria_id             = public.crm_categoria_por_valor(
                                   coalesce((p_payload->>'valor_mercado')::numeric, valor_mercado)),
      valor_mercado            = coalesce((p_payload->>'valor_mercado')::numeric, valor_mercado),
      valor_rateio             = coalesce((p_payload->>'valor_rateio')::numeric, valor_rateio),
      valor_protecao_terceiros = coalesce((p_payload->>'valor_protecao_terceiros')::numeric, valor_protecao_terceiros),
      valor_assistencia        = coalesce((p_payload->>'valor_assistencia')::numeric, valor_assistencia),
      valor_beneficios_extras  = coalesce((p_payload->>'valor_beneficios_extras')::numeric, valor_beneficios_extras),
      taxa_adesao              = coalesce((p_payload->>'taxa_adesao')::numeric, taxa_adesao),
      coberturas_snapshot      = coalesce(p_payload->'coberturas_snapshot', coberturas_snapshot),
      beneficios_snapshot      = coalesce(p_payload->'beneficios_snapshot', beneficios_snapshot),
      observacoes              = nullif(p_payload->>'observacoes',''),
      status                   = coalesce(nullif(p_payload->>'status','')::crm_status_simulacao, status)
    where id = v_sim_id;
  end if;

  return v_sim_id;
end;
$$;

-- Duplica uma simulação junto com uma cópia do veículo, para o consultor
-- alterar valores sem mexer na proposta original.
create or replace function public.crm_duplicar_simulacao(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim      public.crm_simulacoes;
  v_veiculo  public.crm_veiculos;
  v_novo_vei uuid;
  v_novo_sim uuid;
begin
  select * into v_sim from public.crm_simulacoes where id = p_id;
  if not found then
    raise exception 'Simulação % não encontrada.', p_id;
  end if;

  select * into v_veiculo from public.crm_veiculos where id = v_sim.veiculo_id;

  insert into public.crm_veiculos (
    cliente_id, placa, marca, modelo, ano_modelo, ano_fabricacao, chassi,
    renavam, cor, valor_mercado, tipo_veiculo, restricoes,
    restricoes_descricao, observacoes, criado_por
  ) values (
    v_veiculo.cliente_id, v_veiculo.placa, v_veiculo.marca, v_veiculo.modelo,
    v_veiculo.ano_modelo, v_veiculo.ano_fabricacao, v_veiculo.chassi,
    v_veiculo.renavam, v_veiculo.cor, v_veiculo.valor_mercado,
    v_veiculo.tipo_veiculo, v_veiculo.restricoes,
    v_veiculo.restricoes_descricao, v_veiculo.observacoes, auth.uid()
  ) returning id into v_novo_vei;

  insert into public.crm_simulacoes (
    cliente_id, veiculo_id, valor_mercado, valor_rateio,
    valor_protecao_terceiros, valor_assistencia, valor_beneficios_extras,
    taxa_adesao, coberturas_snapshot, beneficios_snapshot, observacoes,
    status, criado_por
  ) values (
    v_sim.cliente_id, v_novo_vei, v_sim.valor_mercado, v_sim.valor_rateio,
    v_sim.valor_protecao_terceiros, v_sim.valor_assistencia,
    v_sim.valor_beneficios_extras, v_sim.taxa_adesao,
    v_sim.coberturas_snapshot, v_sim.beneficios_snapshot,
    v_sim.observacoes, 'rascunho', auth.uid()
  ) returning id into v_novo_sim;

  return v_novo_sim;
end;
$$;

-- ---------------------------------------------------------------------
-- Proposta pública (link do QR code)
-- ---------------------------------------------------------------------
-- SECURITY DEFINER de propósito: o cliente abre o link sem estar logado.
-- Devolve só o que já está impresso no PDF que ele recebeu — nada de
-- telefone, e-mail, custo interno ou qualquer outra simulação. O token é um
-- uuid aleatório e é a única chave de acesso.
create or replace function public.crm_proposta_publica(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'numero',              s.numero,
    'status',              s.status,
    'created_at',          s.created_at,
    'valor_mercado',       s.valor_mercado,
    'valor_rateio',        s.valor_rateio,
    'valor_mensal',        s.valor_mensal,
    'taxa_adesao',         s.taxa_adesao,
    'coberturas',          s.coberturas_snapshot,
    'beneficios',          s.beneficios_snapshot,
    'observacoes',         s.observacoes,
    'cliente_nome',        c.nome,
    'veiculo_placa',       v.placa,
    'veiculo_marca',       v.marca,
    'veiculo_modelo',      v.modelo,
    'veiculo_ano_modelo',  v.ano_modelo,
    'veiculo_ano_fabricacao', v.ano_fabricacao,
    'categoria_codigo',    cat.codigo,
    'categoria_valor_min', cat.valor_min,
    'categoria_valor_max', cat.valor_max,
    'empresa', jsonb_build_object(
      'nome',      cfg.nome_empresa,
      'telefone',  cfg.telefone,
      'whatsapp',  cfg.whatsapp,
      'email',     cfg.email,
      'site',      cfg.site,
      'logo_url',  cfg.logo_url,
      'rodape',    cfg.rodape_pdf,
      'validade_dias', cfg.validade_proposta_dias
    )
  )
  from public.crm_simulacoes s
  join public.crm_clientes c on c.id = s.cliente_id
  join public.crm_veiculos v on v.id = s.veiculo_id
  left join public.crm_categorias cat on cat.id = s.categoria_id
  cross join public.crm_configuracoes cfg
  where s.token_publico = p_token
    and s.status <> 'cancelada';
$$;

revoke all on function public.crm_proposta_publica(uuid) from public;
grant execute on function public.crm_proposta_publica(uuid) to anon, authenticated;

comment on table public.crm_simulacoes is
  'Simulações de proteção veicular. valor_mensal é calculado pelo banco: rateio + terceiros + assistência.';
comment on function public.crm_categoria_por_valor(numeric) is
  'Resolve a categoria (R1..R5) pelo valor de mercado, com fallback para a faixa mais próxima.';
comment on function public.crm_salvar_simulacao(jsonb) is
  'Cria ou atualiza cliente + veículo + simulação atomicamente. Devolve o id da simulação.';
