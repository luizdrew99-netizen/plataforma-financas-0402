"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import * as api from "@/lib/queries"
import type {
  Budget,
  CalendarEvent,
  FinancialGoal,
  Profile,
  Transaction,
  UserType,
} from "@/lib/types"

interface FinanceState {
  /** Nunca nulo: o provider só é montado depois que o perfil carrega. */
  profile: Profile
  userType: UserType
  goals: FinancialGoal[]
  transactions: Transaction[]
  events: CalendarEvent[]
  budgets: Budget[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setUserType: (type: UserType) => Promise<void>
}

const FinanceContext = createContext<FinanceState | null>(null)

export function FinanceProvider({
  profile: initialProfile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = profile.id

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [goalsData, transactionsData, eventsData, budgetsData] =
        await Promise.all([
          api.getGoals(userId),
          api.getTransactions(userId),
          api.getCalendarEvents(userId),
          api.getBudgets(userId),
        ])
      setGoals(goalsData)
      setTransactions(transactionsData)
      setEvents(eventsData)
      setBudgets(budgetsData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar seus dados"
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setUserType = useCallback(
    async (type: UserType) => {
      const previous = profile.user_type
      // Otimista: a troca CLT/MEI só muda a apresentação, então reverter em
      // caso de erro é barato e a UI não trava esperando a rede.
      setProfile((p) => ({ ...p, user_type: type }))
      try {
        await api.updateUserType(userId, type)
      } catch (err) {
        setProfile((p) => ({ ...p, user_type: previous }))
        setError(
          err instanceof Error ? err.message : "Não foi possível trocar o perfil"
        )
      }
    },
    [profile.user_type, userId]
  )

  const value = useMemo<FinanceState>(
    () => ({
      profile,
      userType: profile.user_type,
      goals,
      transactions,
      events,
      budgets,
      loading,
      error,
      refresh,
      setUserType,
    }),
    [profile, goals, transactions, events, budgets, loading, error, refresh, setUserType]
  )

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}

export function useFinance(): FinanceState {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error("useFinance precisa estar dentro de <FinanceProvider>")
  }
  return context
}
