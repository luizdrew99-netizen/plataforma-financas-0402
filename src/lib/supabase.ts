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

// Types
export type UserType = 'clt' | 'mei'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  user_type: UserType
  created_at: string
  updated_at: string
}

export interface FinancialGoal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_amount: number
  category: string
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  status: 'paid' | 'pending'
  due_date: string | null
  paid_date: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  event_type: string
  amount: number | null
  created_at: string
  updated_at: string
}
