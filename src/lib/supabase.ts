import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copie .env.example para .env.local e preencha os valores."
  )
}

/**
 * Cliente do navegador.
 *
 * Usa `createBrowserClient` do @supabase/ssr, que grava a sessão em **cookie**
 * em vez de localStorage. Isso é o que permite ao middleware (que só enxerga
 * cookies) reconhecer o usuário logado — com o cliente padrão do
 * `@supabase/supabase-js` a sessão ficava invisível no servidor e todo acesso
 * ao /dashboard era redirecionado de volta para o /auth.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export * from "./types"
