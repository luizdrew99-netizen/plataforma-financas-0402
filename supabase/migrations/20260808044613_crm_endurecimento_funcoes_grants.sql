-- Complemento da migração 20260808044420: lá o `revoke ... from public` não
-- surtiu efeito porque o Supabase concede EXECUTE diretamente aos papéis
-- `anon` e `authenticated` (via default privileges do schema `public`). Tirar
-- do PUBLIC não mexe num grant nominal — é preciso revogar de cada papel.

-- Funções de gatilho: ninguém precisa chamá-las pela API. O disparo do trigger
-- não depende deste privilégio (o Postgres confere na criação do trigger) —
-- conferido na prática: depois deste revoke, uma escrita em `clientes` como
-- `authenticated` continuou gravando a linha de auditoria, e um cadastro novo
-- em `auth.users` continuou criando o perfil pelo `handle_new_user`.
revoke execute on function public.handle_new_user()     from anon, authenticated;
revoke execute on function public.registrar_auditoria() from anon, authenticated;

-- Auxiliares de papel: `authenticated` mantém, porque as 23 policies de RLS
-- que as usam rodam com o privilégio de quem consulta. Para o anônimo elas só
-- responderiam "não é admin".
revoke execute on function public.e_admin()   from anon;
revoke execute on function public.e_gestor()  from anon;
revoke execute on function public.meu_papel() from anon;
