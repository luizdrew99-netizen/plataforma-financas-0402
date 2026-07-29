import type { Budget, FinancialGoal, Transaction, UserType } from "./types"
import { parseISODate } from "./format"

/** Data de referência de uma transação: vencimento, ou a criação se não houver. */
function referenceDate(transaction: Transaction): Date {
  return parseISODate(
    (transaction.due_date ?? transaction.created_at).slice(0, 10)
  )
}

function isSameMonth(date: Date, month: number, year: number): boolean {
  return date.getMonth() === month && date.getFullYear() === year
}

export interface MonthlySummary {
  income: number
  expense: number
  balance: number
  /** Despesas ainda não pagas com vencimento no mês. */
  pendingExpense: number
  /** Receitas já confirmadas no mês. */
  confirmedIncome: number
  savingsRate: number
}

export function summarizeMonth(
  transactions: Transaction[],
  reference: Date = new Date()
): MonthlySummary {
  const month = reference.getMonth()
  const year = reference.getFullYear()

  const inMonth = transactions.filter((t) =>
    isSameMonth(referenceDate(t), month, year)
  )

  const income = sum(inMonth.filter((t) => t.type === "income"))
  const expense = sum(inMonth.filter((t) => t.type === "expense"))
  const pendingExpense = sum(
    inMonth.filter((t) => t.type === "expense" && t.status === "pending")
  )
  const confirmedIncome = sum(
    inMonth.filter((t) => t.type === "income" && t.status === "paid")
  )
  const balance = income - expense

  return {
    income,
    expense,
    balance,
    pendingExpense,
    confirmedIncome,
    savingsRate: income > 0 ? (balance / income) * 100 : 0,
  }
}

function sum(transactions: Transaction[]): number {
  return transactions.reduce((total, t) => total + Number(t.amount), 0)
}

/** Variação percentual entre dois valores. `null` quando não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function previousMonth(reference: Date = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
}

export interface CategoryBreakdown {
  category: string
  spent: number
  budget: number | null
  percentage: number | null
}

export function breakdownByCategory(
  transactions: Transaction[],
  budgets: Budget[],
  reference: Date = new Date()
): CategoryBreakdown[] {
  const month = reference.getMonth()
  const year = reference.getFullYear()

  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== "expense") continue
    if (!isSameMonth(referenceDate(t), month, year)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount))
  }

  // Categorias com orçamento definido aparecem mesmo sem gasto no mês, para o
  // usuário ver que ainda tem folga.
  for (const budget of budgets) {
    if (!totals.has(budget.category)) totals.set(budget.category, 0)
  }

  return Array.from(totals.entries())
    .map(([category, spent]) => {
      const budget = budgets.find((b) => b.category === category)
      const limit = budget ? Number(budget.monthly_limit) : null
      return {
        category,
        spent,
        budget: limit,
        percentage: limit && limit > 0 ? (spent / limit) * 100 : null,
      }
    })
    .sort((a, b) => b.spent - a.spent)
}

export type InsightTone = "success" | "warning" | "tip" | "info"

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  description: string
}

/**
 * Insights derivados dos dados reais do usuário. Sem dados suficientes a lista
 * vem vazia — é melhor a tela dizer "cadastre transações" do que exibir uma
 * análise inventada sobre o dinheiro de alguém.
 */
export function buildInsights(
  transactions: Transaction[],
  goals: FinancialGoal[],
  budgets: Budget[],
  userType: UserType,
  reference: Date = new Date()
): Insight[] {
  const insights: Insight[] = []
  const current = summarizeMonth(transactions, reference)
  const previous = summarizeMonth(transactions, previousMonth(reference))

  if (current.income === 0 && current.expense === 0) return insights

  // Saldo do mês
  if (current.balance > 0) {
    insights.push({
      id: "balance-positive",
      tone: "success",
      title: "Saldo positivo no mês",
      description:
        `Você fechou com sobra de ${current.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` +
        ` — ${current.savingsRate.toFixed(0)}% de tudo que entrou.`,
    })
  } else if (current.balance < 0) {
    insights.push({
      id: "balance-negative",
      tone: "warning",
      title: "Você gastou mais do que recebeu",
      description:
        `As despesas superaram as receitas em ${Math.abs(current.balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} neste mês.`,
    })
  }

  // Comparação com o mês anterior
  const expenseChange = percentChange(current.expense, previous.expense)
  if (expenseChange !== null && Math.abs(expenseChange) >= 10) {
    insights.push({
      id: "expense-trend",
      tone: expenseChange > 0 ? "warning" : "success",
      title:
        expenseChange > 0
          ? "Despesas subiram em relação ao mês passado"
          : "Despesas caíram em relação ao mês passado",
      description: `Variação de ${expenseChange > 0 ? "+" : ""}${expenseChange.toFixed(1)}% no total de gastos.`,
    })
  }

  // Estouro de orçamento
  const overBudget = breakdownByCategory(transactions, budgets, reference).filter(
    (c) => c.percentage !== null && c.percentage > 100
  )
  for (const category of overBudget.slice(0, 2)) {
    insights.push({
      id: `over-budget-${category.category}`,
      tone: "warning",
      title: `Orçamento de ${category.category} estourado`,
      description: `Gasto de ${category.spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} contra um limite de ${category.budget!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    })
  }

  // Contas vencidas
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = transactions.filter(
    (t) =>
      t.type === "expense" &&
      t.status === "pending" &&
      t.due_date &&
      parseISODate(t.due_date) < today
  )
  if (overdue.length > 0) {
    insights.push({
      id: "overdue",
      tone: "warning",
      title: `${overdue.length} conta${overdue.length > 1 ? "s" : ""} em atraso`,
      description: `Total de ${sum(overdue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} com vencimento já passado.`,
    })
  }

  // Progresso das metas
  const closest = goals
    .filter((g) => Number(g.target_amount) > 0)
    .map((g) => ({
      goal: g,
      progress: (Number(g.current_amount) / Number(g.target_amount)) * 100,
    }))
    .sort((a, b) => b.progress - a.progress)[0]

  if (closest && closest.progress >= 75 && closest.progress < 100) {
    insights.push({
      id: "goal-close",
      tone: "info",
      title: `"${closest.goal.title}" está quase lá`,
      description: `Você já alcançou ${closest.progress.toFixed(0)}% dessa meta.`,
    })
  }

  // Sugestão de aporte
  if (current.balance > 0 && goals.length > 0) {
    insights.push({
      id: "goal-suggestion",
      tone: "tip",
      title: "Direcione a sobra para uma meta",
      description:
        userType === "mei"
          ? "Considere transferir parte do lucro do mês para a reserva do negócio."
          : "Considere aplicar parte do que sobrou em uma das suas metas.",
    })
  }

  return insights
}
