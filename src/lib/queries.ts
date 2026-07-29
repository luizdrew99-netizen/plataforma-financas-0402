import { supabase } from "./supabase"
import type {
  Budget,
  CalendarEvent,
  FinancialGoal,
  Profile,
  Transaction,
} from "./types"

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateUserType(
  userId: string,
  userType: Profile["user_type"]
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: userType })
    .eq("id", userId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

export async function getGoals(userId: string): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export type NewGoal = {
  title: string
  category: string
  target_amount: number
  current_amount?: number
  deadline: string | null
}

export async function createGoal(
  userId: string,
  goal: NewGoal
): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({ ...goal, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGoal(
  id: string,
  patch: Partial<NewGoal>
): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from("financial_goals")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("financial_goals").delete().eq("id", id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Transações / pagamentos
// ---------------------------------------------------------------------------

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: false, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

export type NewTransaction = {
  title: string
  amount: number
  type: Transaction["type"]
  category: string
  status: Transaction["status"]
  recurring: boolean
  due_date: string | null
  paid_date?: string | null
}

export async function createTransaction(
  userId: string,
  transaction: NewTransaction
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...transaction, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTransaction(
  id: string,
  patch: Partial<NewTransaction>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export async function getCalendarEvents(
  userId: string
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: true })

  if (error) throw error
  return data ?? []
}

export type NewCalendarEvent = {
  title: string
  description: string | null
  event_date: string
  event_type: CalendarEvent["event_type"]
  amount: number | null
}

export async function createCalendarEvent(
  userId: string,
  event: NewCalendarEvent
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...event, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<NewCalendarEvent & { completed: boolean }>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("category", { ascending: true })

  if (error) throw error
  return data ?? []
}
