-- =====================================================================
-- Complementos do CRM da ABPAC para o app Next.js em /crm
-- =====================================================================
-- Estado final das versões 20260731034626 e 20260731040306, consolidado
-- para poder ser reaplicado de uma vez. É aditivo: nada existente do
-- sistema anterior é removido ou renomeado. Idempotente.
--
-- Depende do schema base já existente (versões 20260723013116 e
-- 20260723013130) — ver supabase/migrations/README.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Colunas novas
-- ---------------------------------------------------------------------

-- Cabeçalho, rodapé e assinatura da proposta
alter table public.configuracoes
  add column if not exists endereco           text,
  add column if not exists site               text,
  add column if not exists observacoes_padrao text,
  add column if not exists assinatura_nome    text,
  add column if not exists assinatura_cargo   text;

-- "já vem marcado numa simulação nova"
alter table public.coberturas
  add column if not exists padrao boolean not null default true;

alter table public.beneficios
  add column if not exists padrao boolean not null default true;

-- Soma dos benefícios que o admin cadastrar além dos dois padrão
alter table public.simulacoes
  add column if not exists valor_beneficios_extras numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------
-- total_mensal precisa somar também os benefícios extras
-- ---------------------------------------------------------------------
-- A expressão original somava só rateio + terceiros + assistência. Com um
-- terceiro benefício possível, o valor dele ficaria fora do total gravado:
-- a tela mostraria um número e o banco guardaria outro. Postgres não deixa
-- alterar a expressão de uma coluna gerada, então ela é recriada — sem
-- perda de dados, já que o valor é derivado.
drop view if exists public.simulacoes_detalhe;

alter table public.simulacoes drop column if exists total_mensal;

alter table public.simulacoes
  add column total_mensal numeric(12,2)
  generated always as (
    valor_rateio + valor_terceiros + valor_assistencia + valor_beneficios_extras
  ) stored;

-- ---------------------------------------------------------------------
-- Contrato: numeração própria e campos de cobrança
-- ---------------------------------------------------------------------
create sequence if not exists public.seq_contrato start 1;

alter table public.contratos
  add column if not exists numero         text,
  add column if not exists valor_protecao numeric(14,2) not null default 0,
  add column if not exists dia_vencimento integer,
  add column if not exists observacoes    text;

do $$ begin
  alter table public.contratos
    add constraint contratos_dia_vencimento_valido
    check (dia_vencimento is null or dia_vencimento between 1 and 31);
exception when duplicate_object then null; end $$;

-- Numera contratos que já existiam antes desta migração
update public.contratos
   set numero = 'CTR-' || to_char(created_at, 'YYYY') || '-' ||
                lpad(nextval('public.seq_contrato')::text, 6, '0')
 where numero is null;

create or replace function public.gerar_numero_contrato()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'CTR-' || to_char(now(), 'YYYY') || '-' ||
                  lpad(nextval('public.seq_contrato')::text, 6, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_contrato_numero on public.contratos;
create trigger trg_contrato_numero before insert on public.contratos
  for each row execute function public.gerar_numero_contrato();

do $$ begin
  alter table public.contratos add constraint contratos_numero_unico unique (numero);
exception when duplicate_table or duplicate_object then null; end $$;

-- Faltava poder excluir contrato; mesmo critério das outras tabelas.
drop policy if exists p_contratos_delete on public.contratos;
create policy p_contratos_delete on public.contratos
  for delete to authenticated using (public.e_gestor());

-- ---------------------------------------------------------------------
-- Visão de leitura: simulação + cliente + veículo + categoria + contrato
-- ---------------------------------------------------------------------
create or replace view public.simulacoes_detalhe
with (security_invoker = true) as
select
  s.*,
  c.nome                 as cliente_nome,
  c.telefone             as cliente_telefone,
  c.whatsapp             as cliente_whatsapp,
  c.email                as cliente_email,
  c.cidade               as cliente_cidade,
  c.uf                   as cliente_uf,
  c.tipo_pessoa          as cliente_tipo_pessoa,
  v.placa                as veiculo_placa,
  v.marca                as veiculo_marca,
  v.modelo               as veiculo_modelo,
  v.ano_modelo           as veiculo_ano_modelo,
  v.ano_fabricacao       as veiculo_ano_fabricacao,
  v.restricoes           as veiculo_restricoes,
  v.restricoes_descricao as veiculo_restricoes_descricao,
  cat.codigo             as categoria_codigo,
  cat.nome               as categoria_nome,
  cat.valor_min          as categoria_valor_min,
  cat.valor_max          as categoria_valor_max,
  ct.id                  as contrato_id,
  ct.numero              as contrato_numero,
  ct.situacao            as contrato_situacao
from public.simulacoes s
join public.clientes c on c.id = s.cliente_id
join public.veiculos v on v.id = s.veiculo_id
left join public.categorias cat on cat.id = s.categoria_id
left join public.contratos  ct  on ct.simulacao_id = s.id;

-- ---------------------------------------------------------------------
-- Gravação da simulação em uma transação só
-- ---------------------------------------------------------------------
-- Cliente, veículo e simulação nascem juntos: em três chamadas separadas do
-- front, uma falha no meio deixaria cliente órfão. O snapshot é montado aqui
-- de propósito — assim a empresa e a categoria gravadas são sempre as do
-- banco, e não o que o navegador achava que eram.
create or replace function public.salvar_simulacao(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim_id     uuid  := nullif(p_payload->>'simulacao_id', '')::uuid;
  v_cliente    jsonb := coalesce(p_payload->'cliente', '{}'::jsonb);
  v_veiculo    jsonb := coalesce(p_payload->'veiculo', '{}'::jsonb);
  v_cliente_id uuid  := nullif(v_cliente->>'id', '')::uuid;
  v_veiculo_id uuid  := nullif(v_veiculo->>'id', '')::uuid;
  v_existente  public.simulacoes;
  v_categoria  public.categorias;
  v_cfg        public.configuracoes;
  v_mercado    numeric := coalesce((p_payload->>'valor_mercado')::numeric, 0);
  v_rateio     numeric := coalesce((p_payload->>'valor_rateio')::numeric, 0);
  v_terceiros  numeric := coalesce((p_payload->>'valor_terceiros')::numeric, 0);
  v_assist     numeric := coalesce((p_payload->>'valor_assistencia')::numeric, 0);
  v_extras     numeric := coalesce((p_payload->>'valor_beneficios_extras')::numeric, 0);
  v_adesao     numeric := coalesce((p_payload->>'taxa_adesao')::numeric, 0);
  v_total      numeric;
  v_snapshot   jsonb;
  v_versao     integer := 1;
begin
  if v_sim_id is not null then
    select * into v_existente from public.simulacoes where id = v_sim_id;
    if not found then
      raise exception 'Simulação % não encontrada.', v_sim_id;
    end if;
    v_cliente_id := coalesce(v_cliente_id, v_existente.cliente_id);
    v_veiculo_id := coalesce(v_veiculo_id, v_existente.veiculo_id);
    v_versao     := coalesce(v_existente.versao, 1) + 1;
  end if;

  -- Mesma fórmula da coluna gerada. Se uma mudar, a outra tem que mudar.
  v_total := v_rateio + v_terceiros + v_assist + v_extras;

  -- Categoria pela faixa; se o valor cair num vão entre faixas, pega a mais
  -- próxima por baixo em vez de deixar a simulação sem categoria.
  v_categoria := public.categoria_por_valor(v_mercado);
  if v_categoria.id is null then
    select * into v_categoria from public.categorias
     where ativo and valor_min <= v_mercado order by valor_min desc limit 1;
  end if;
  if v_categoria.id is null then
    select * into v_categoria from public.categorias where ativo order by ordem limit 1;
  end if;

  select * into v_cfg from public.configuracoes where id;

  -- Cliente
  if v_cliente_id is null then
    insert into public.clientes (
      tipo_pessoa, nome, telefone, whatsapp, email, cidade, uf, observacoes, criado_por
    ) values (
      coalesce(nullif(v_cliente->>'tipo_pessoa',''), 'pf')::tipo_pessoa,
      coalesce(nullif(v_cliente->>'nome',''), 'Sem nome'),
      nullif(v_cliente->>'telefone',''),
      nullif(v_cliente->>'whatsapp',''),
      nullif(v_cliente->>'email',''),
      nullif(v_cliente->>'cidade',''),
      nullif(v_cliente->>'uf',''),
      nullif(v_cliente->>'observacoes',''),
      auth.uid()
    ) returning id into v_cliente_id;
  else
    update public.clientes set
      nome        = coalesce(nullif(v_cliente->>'nome',''), nome),
      telefone    = coalesce(nullif(v_cliente->>'telefone',''), telefone),
      whatsapp    = coalesce(nullif(v_cliente->>'whatsapp',''), whatsapp),
      email       = coalesce(nullif(v_cliente->>'email',''), email),
      cidade      = coalesce(nullif(v_cliente->>'cidade',''), cidade),
      uf          = coalesce(nullif(v_cliente->>'uf',''), uf),
      observacoes = coalesce(nullif(v_cliente->>'observacoes',''), observacoes)
    where id = v_cliente_id;
  end if;

  -- Veículo (a placa é normalizada aqui: sem hífen, maiúscula)
  if v_veiculo_id is null then
    insert into public.veiculos (
      cliente_id, placa, marca, modelo, ano_modelo, ano_fabricacao,
      restricoes, restricoes_descricao, observacoes, criado_por
    ) values (
      v_cliente_id,
      upper(regexp_replace(coalesce(v_veiculo->>'placa',''), '[^A-Za-z0-9]', '', 'g')),
      nullif(v_veiculo->>'marca',''),
      nullif(v_veiculo->>'modelo',''),
      nullif(v_veiculo->>'ano_modelo','')::integer,
      nullif(v_veiculo->>'ano_fabricacao','')::integer,
      coalesce(v_veiculo->'restricoes', '[]'::jsonb),
      nullif(v_veiculo->>'restricoes_descricao',''),
      nullif(v_veiculo->>'observacoes',''),
      auth.uid()
    ) returning id into v_veiculo_id;
  else
    update public.veiculos set
      cliente_id           = v_cliente_id,
      placa                = coalesce(nullif(upper(regexp_replace(coalesce(v_veiculo->>'placa',''), '[^A-Za-z0-9]', '', 'g')), ''), placa),
      marca                = coalesce(nullif(v_veiculo->>'marca',''), marca),
      modelo               = coalesce(nullif(v_veiculo->>'modelo',''), modelo),
      ano_modelo           = coalesce(nullif(v_veiculo->>'ano_modelo','')::integer, ano_modelo),
      ano_fabricacao       = coalesce(nullif(v_veiculo->>'ano_fabricacao','')::integer, ano_fabricacao),
      restricoes           = coalesce(v_veiculo->'restricoes', restricoes),
      restricoes_descricao = nullif(v_veiculo->>'restricoes_descricao',''),
      observacoes          = nullif(v_veiculo->>'observacoes','')
    where id = v_veiculo_id;
  end if;

  -- Fotografia do que foi vendido: não muda se o cadastro mudar depois
  v_snapshot := jsonb_build_object(
    'versao', v_versao,
    'gerado_em', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'validade_dias', v_cfg.validade_proposta_dias,
    'empresa', jsonb_build_object(
      'nome_associacao', v_cfg.nome_associacao,
      'cnpj', v_cfg.cnpj,
      'telefone', v_cfg.telefone,
      'whatsapp', v_cfg.whatsapp,
      'email', v_cfg.email,
      'endereco', v_cfg.endereco,
      'site', v_cfg.site,
      'logo_url', v_cfg.logo_url,
      'rodape_pdf', v_cfg.rodape_pdf,
      'assinatura_nome', v_cfg.assinatura_nome,
      'assinatura_cargo', v_cfg.assinatura_cargo
    ),
    'categoria', jsonb_build_object(
      'codigo', v_categoria.codigo,
      'nome', v_categoria.nome,
      'valor_min', v_categoria.valor_min,
      'valor_max', v_categoria.valor_max
    ),
    'valores', jsonb_build_object(
      'valor_mercado', v_mercado,
      'valor_rateio', v_rateio,
      'valor_terceiros', v_terceiros,
      'valor_assistencia', v_assist,
      'valor_beneficios_extras', v_extras,
      'taxa_adesao', v_adesao,
      'total_mensal', v_total
    ),
    'coberturas', coalesce(p_payload->'coberturas', '[]'::jsonb),
    'beneficios', coalesce(p_payload->'beneficios', '[]'::jsonb)
  );

  -- total_mensal é coluna gerada: não entra no insert/update.
  if v_sim_id is null then
    insert into public.simulacoes (
      cliente_id, veiculo_id, categoria_id, valor_mercado, valor_rateio,
      valor_terceiros, valor_assistencia, valor_beneficios_extras, taxa_adesao,
      status, versao, snapshot, observacoes, criado_por
    ) values (
      v_cliente_id, v_veiculo_id, v_categoria.id, v_mercado, v_rateio,
      v_terceiros, v_assist, v_extras, v_adesao,
      coalesce(nullif(p_payload->>'status',''), 'gerada')::status_simulacao,
      1, v_snapshot, nullif(p_payload->>'observacoes',''), auth.uid()
    ) returning id into v_sim_id;
  else
    update public.simulacoes set
      cliente_id              = v_cliente_id,
      veiculo_id              = v_veiculo_id,
      categoria_id            = v_categoria.id,
      valor_mercado           = v_mercado,
      valor_rateio            = v_rateio,
      valor_terceiros         = v_terceiros,
      valor_assistencia       = v_assist,
      valor_beneficios_extras = v_extras,
      taxa_adesao             = v_adesao,
      status                  = coalesce(nullif(p_payload->>'status','')::status_simulacao, status),
      versao                  = v_versao,
      snapshot                = v_snapshot,
      observacoes             = nullif(p_payload->>'observacoes','')
    where id = v_sim_id;
  end if;

  return v_sim_id;
end $$;

-- ---------------------------------------------------------------------
-- Confirmar simulação -> contrato, numa transação só
-- ---------------------------------------------------------------------
create or replace function public.confirmar_simulacao(p_simulacao_id uuid)
returns public.contratos
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim public.simulacoes;
  v_ct  public.contratos;
begin
  select * into v_sim from public.simulacoes where id = p_simulacao_id;
  if not found then
    raise exception 'Simulação % não encontrada.', p_simulacao_id;
  end if;

  -- Confirmar duas vezes não pode gerar dois contratos.
  select * into v_ct from public.contratos where simulacao_id = p_simulacao_id;
  if found then
    return v_ct;
  end if;

  update public.simulacoes set status = 'confirmada' where id = p_simulacao_id;

  insert into public.contratos (
    simulacao_id, cliente_id, veiculo_id, situacao,
    valor_protecao, valor_mensal, taxa_adesao, criado_por
  ) values (
    v_sim.id, v_sim.cliente_id, v_sim.veiculo_id, 'pendente',
    v_sim.valor_mercado, v_sim.total_mensal, v_sim.taxa_adesao, auth.uid()
  ) returning * into v_ct;

  return v_ct;
end $$;

-- ---------------------------------------------------------------------
-- Duplicar simulação (com cópia do veículo, para alterar sem mexer na original)
-- ---------------------------------------------------------------------
create or replace function public.duplicar_simulacao(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_sim      public.simulacoes;
  v_v        public.veiculos;
  v_novo_vei uuid;
  v_novo_sim uuid;
begin
  select * into v_sim from public.simulacoes where id = p_id;
  if not found then
    raise exception 'Simulação % não encontrada.', p_id;
  end if;

  select * into v_v from public.veiculos where id = v_sim.veiculo_id;

  insert into public.veiculos (
    cliente_id, placa, marca, modelo, ano_modelo, ano_fabricacao, chassi,
    renavam, cor, restricoes, restricoes_descricao, observacoes, criado_por
  ) values (
    v_v.cliente_id, v_v.placa, v_v.marca, v_v.modelo, v_v.ano_modelo,
    v_v.ano_fabricacao, v_v.chassi, v_v.renavam, v_v.cor, v_v.restricoes,
    v_v.restricoes_descricao, v_v.observacoes, auth.uid()
  ) returning id into v_novo_vei;

  insert into public.simulacoes (
    cliente_id, veiculo_id, categoria_id, valor_mercado, valor_rateio,
    valor_terceiros, valor_assistencia, valor_beneficios_extras, taxa_adesao,
    status, versao, snapshot, observacoes, criado_por
  ) values (
    v_sim.cliente_id, v_novo_vei, v_sim.categoria_id, v_sim.valor_mercado,
    v_sim.valor_rateio, v_sim.valor_terceiros, v_sim.valor_assistencia,
    v_sim.valor_beneficios_extras, v_sim.taxa_adesao,
    'rascunho', 1, v_sim.snapshot, v_sim.observacoes, auth.uid()
  ) returning id into v_novo_sim;

  return v_novo_sim;
end $$;

-- ---------------------------------------------------------------------
-- Indicadores do dashboard em uma chamada só
-- ---------------------------------------------------------------------
create or replace function public.dashboard_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'total_simulacoes',   (select count(*) from public.simulacoes),
    'simulacoes_hoje',    (select count(*) from public.simulacoes
                            where created_at >= date_trunc('day', now())),
    'simulacoes_mes',     (select count(*) from public.simulacoes
                            where created_at >= date_trunc('month', now())),
    'confirmadas',        (select count(*) from public.simulacoes where status = 'confirmada'),
    'valor_medio',        (select coalesce(round(avg(total_mensal), 2), 0) from public.simulacoes),
    'ticket_confirmado_mes', (select coalesce(sum(total_mensal), 0) from public.simulacoes
                               where status = 'confirmada'
                                 and created_at >= date_trunc('month', now())),
    'total_clientes',     (select count(*) from public.clientes),
    'total_veiculos',     (select count(*) from public.veiculos),
    'contratos_ativos',   (select count(*) from public.contratos where situacao = 'ativo'),
    'serie_mensal', (
      select coalesce(jsonb_agg(linha order by linha->>'mes'), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'mes', to_char(m.mes, 'YYYY-MM'),
                   'simulacoes', count(s.id),
                   'confirmadas', count(s.id) filter (where s.status = 'confirmada'),
                   'valor', coalesce(sum(s.total_mensal), 0)
                 ) as linha
            from generate_series(
                   date_trunc('month', now()) - interval '11 months',
                   date_trunc('month', now()), interval '1 month') as m(mes)
            left join public.simulacoes s on date_trunc('month', s.created_at) = m.mes
           group by m.mes
        ) t
    )
  );
$$;

-- ---------------------------------------------------------------------
-- Busca única: nome, CPF, CNPJ, placa, modelo, marca, telefone
-- ---------------------------------------------------------------------
create or replace function public.busca_global(p_termo text)
returns table (tipo text, id uuid, titulo text, subtitulo text, referencia uuid)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with t as (
    select nullif(trim(p_termo), '') as bruto,
           regexp_replace(coalesce(p_termo, ''), '[^A-Za-z0-9]', '', 'g') as limpo
  )
  select 'cliente', c.id, c.nome,
         coalesce(c.cidade || '/' || c.uf, c.telefone, c.email, ''), c.id
    from public.clientes c, t
   where t.bruto is not null
     and (c.nome ilike '%' || t.bruto || '%'
       or coalesce(c.razao_social,'')  ilike '%' || t.bruto || '%'
       or coalesce(c.nome_fantasia,'') ilike '%' || t.bruto || '%'
       or (t.limpo <> '' and regexp_replace(coalesce(c.cpf,''),      '[^0-9]', '', 'g') like '%' || t.limpo || '%')
       or (t.limpo <> '' and regexp_replace(coalesce(c.cnpj,''),     '[^0-9]', '', 'g') like '%' || t.limpo || '%')
       or (t.limpo <> '' and regexp_replace(coalesce(c.telefone,''), '[^0-9]', '', 'g') like '%' || t.limpo || '%'))
  union all
  select 'veiculo', v.id,
         upper(v.placa) || ' — ' || coalesce(v.marca,'') || ' ' || coalesce(v.modelo,''),
         coalesce(v.ano_modelo::text, ''), v.cliente_id
    from public.veiculos v, t
   where t.bruto is not null
     and ((t.limpo <> '' and upper(v.placa) like '%' || upper(t.limpo) || '%')
       or coalesce(v.modelo,'') ilike '%' || t.bruto || '%'
       or coalesce(v.marca,'')  ilike '%' || t.bruto || '%'
       or coalesce(v.chassi,'') ilike '%' || t.bruto || '%')
  limit 30;
$$;

comment on function public.salvar_simulacao(jsonb) is
  'Cria ou atualiza cliente + veículo + simulação atomicamente, montando o snapshot no banco. Devolve o id da simulação.';
comment on column public.simulacoes.total_mensal is
  'Coluna gerada: rateio + terceiros + assistência + benefícios extras.';
