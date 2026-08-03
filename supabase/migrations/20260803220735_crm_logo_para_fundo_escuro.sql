-- Segunda versão da logo, para fundo escuro.
--
-- A logo da ABPAC é azul-marinho sobre fundo claro: no tema escuro do CRM ela
-- praticamente desaparece. Guardar as duas versões resolve sem truque de CSS
-- (filtro de inversão estragaria o vermelho do desenho).
--
-- É opcional: sem ela, a interface mostra a logo principal sobre uma lasca
-- branca no tema escuro, que funciona com qualquer arquivo.
alter table public.configuracoes
  add column if not exists logo_url_escura text;

comment on column public.configuracoes.logo_url_escura is
  'Logo para fundo escuro (tema escuro do CRM). Opcional.';

-- A tela de login roda sem sessão e precisa das duas.
create or replace function public.identidade_publica()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nome_associacao', c.nome_associacao,
    'logo_url', c.logo_url,
    'logo_url_escura', c.logo_url_escura
  )
  from public.configuracoes c
  limit 1;
$$;

comment on function public.identidade_publica() is
  'Nome e logos da associação para a tela de login. Não expõe dados de contato.';

revoke all on function public.identidade_publica() from public;
grant execute on function public.identidade_publica() to anon, authenticated;
