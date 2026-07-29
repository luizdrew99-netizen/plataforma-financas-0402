// Tipos de domínio do ProFin, espelhando supabase/migrations/0001_init.sql.

export type UserType = "clt" | "mei"

export type TransactionType = "income" | "expense"
export type TransactionStatus = "paid" | "pending"
/** `overdue` é derivado no cliente (pendente + vencido), não existe no banco. */
export type PaymentStatus = TransactionStatus | "overdue"

export type CalendarEventType = "payment" | "income" | "reminder" | "goal"

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
  type: TransactionType
  category: string
  status: TransactionStatus
  recurring: boolean
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
  event_type: CalendarEventType
  amount: number | null
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  created_at: string
  updated_at: string
}
