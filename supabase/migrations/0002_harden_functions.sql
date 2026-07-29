-- ============================================================================
-- Endurecimento das funções criadas em 0001
-- ============================================================================
-- Apontado pelo database linter do Supabase:
--   0011_function_search_path_mutable
--   0028/0029_*_security_definer_function_executable
-- ============================================================================

-- `search_path` fixo: sem isso, um schema controlado pelo chamador poderia
-- ficar à frente do `public` na resolução de nomes dentro da função.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- `handle_new_user` é SECURITY DEFINER e só deve rodar pelo trigger em
-- auth.users. Como está no schema `public`, o PostgREST a expunha como
-- /rest/v1/rpc/handle_new_user para anon e authenticated — ou seja, dava para
-- chamá-la de fora com os privilégios do dono da função.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- O trigger continua funcionando: ele executa com os privilégios do dono da
-- tabela, não do papel que fez o INSERT.
