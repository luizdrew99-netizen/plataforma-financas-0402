-- Faxina apontada pelo verificador de segurança do Supabase.
-- Nada aqui muda comportamento do sistema: só fecha porta que estava aberta
-- sem necessidade e fixa o search_path de funções que não tinham.
--
-- ATENÇÃO: os `revoke ... from public` desta migração NÃO surtem efeito
-- sozinhos — o Supabase concede EXECUTE nominalmente a `anon` e
-- `authenticated`, e tirar do PUBLIC não mexe num grant nominal. Quem de fato
-- fecha é a migração seguinte, 20260808044613.

-- 1) search_path fixo. Estas cinco não são `security definer` (rodam com o
--    privilégio de quem chama), então o risco era baixo — mas com o
--    search_path solto, um schema plantado na frente do `public` poderia
--    sequestrar uma referência de tabela dentro delas.
alter function public.categoria_por_valor(numeric)         set search_path = public, pg_catalog;
alter function public.gerar_numero_simulacao()             set search_path = public, pg_catalog;
alter function public.gerar_numero_contrato()              set search_path = public, pg_catalog;
alter function public.tocar_updated_at()                   set search_path = public, pg_catalog;
alter function public.verificar_lacunas_categorias()       set search_path = public, pg_catalog;

-- 2) Funções de gatilho não deveriam ser chamáveis pela API REST. Chamar
--    qualquer uma delas fora de um trigger já dava erro, mas não há motivo
--    para elas aparecerem em `/rest/v1/rpc/`.
--
--    O disparo do trigger NÃO depende destes grants: o Postgres confere o
--    privilégio na hora de criar o trigger, não a cada disparo. Ainda assim,
--    `handle_new_user` fica explicitamente concedida ao papel que insere em
--    `auth.users`, para não restar dúvida sobre o cadastro de usuário.
revoke all on function public.handle_new_user()    from public;
revoke all on function public.registrar_auditoria() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
grant execute on function public.registrar_auditoria() to service_role;

-- 3) As três auxiliares de papel são usadas dentro das policies de RLS, e
--    policy roda com o privilégio de quem consulta: `authenticated` PRECISA
--    poder executá-las (todas as 23 policies que as usam são desse papel).
--    Para o anônimo elas só devolveriam "não é admin" — tirar não custa nada.
revoke all on function public.e_admin()   from public;
revoke all on function public.e_gestor()  from public;
revoke all on function public.meu_papel() from public;
grant execute on function public.e_admin()   to authenticated, service_role;
grant execute on function public.e_gestor()  to authenticated, service_role;
grant execute on function public.meu_papel() to authenticated, service_role;
