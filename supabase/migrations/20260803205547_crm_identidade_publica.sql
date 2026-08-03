-- Identidade visual da associação para telas que rodam SEM sessão (o login).
-- `configuracoes` só é legível por usuário autenticado, e continua assim: esta
-- função devolve apenas nome e logo — os mesmos dois campos que já aparecem na
-- página pública da proposta. CNPJ, telefone, e-mail e endereço não saem daqui.
create or replace function public.identidade_publica()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nome_associacao', c.nome_associacao,
    'logo_url', c.logo_url
  )
  from public.configuracoes c
  limit 1;
$$;

comment on function public.identidade_publica() is
  'Nome e logo da associação para a tela de login. Não expõe dados de contato.';

revoke all on function public.identidade_publica() from public;
grant execute on function public.identidade_publica() to anon, authenticated;
