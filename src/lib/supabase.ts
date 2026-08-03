import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** `true` quando falta configurar as variáveis de ambiente do Supabase. */
export const configuracaoSupabaseAusente = !supabaseUrl || !supabaseAnonKey

if (configuracaoSupabaseAusente && typeof window !== 'undefined') {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão ' +
      'configuradas. O app carrega, mas nenhuma consulta vai funcionar.'
  )
}

// Os valores de reserva existem só para o `createClient` não lançar durante o
// build: as páginas são client components e o Next as pré-renderiza no
// servidor, onde as variáveis podem não estar presentes (é o caso do ambiente
// de Preview da Vercel sem as chaves configuradas). Sem isso, o build inteiro
// falha no prerender em vez de subir um app que avisa o que está faltando.
export const supabase = createClient(
  supabaseUrl || 'https://configuracao-ausente.supabase.co',
  supabaseAnonKey || 'configuracao-ausente'
)
