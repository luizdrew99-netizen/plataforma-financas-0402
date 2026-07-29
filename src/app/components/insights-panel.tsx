"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Lightbulb, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  breakdownByCategory,
  buildInsights,
  previousMonth,
  summarizeMonth,
  type InsightTone,
} from "@/lib/finance"
import { formatCurrency, formatPercent } from "@/lib/format"
import { useFinance } from "../dashboard/finance-context"

const TONE_META: Record<
  InsightTone,
  { icon: typeof Info; color: string }
> = {
  success: { icon: CheckCircle, color: "from-emerald-500 to-emerald-600" },
  warning: { icon: AlertCircle, color: "from-orange-500 to-orange-600" },
  tip: { icon: Lightbulb, color: "from-blue-500 to-blue-600" },
  info: { icon: Info, color: "from-purple-500 to-purple-600" },
}

export function InsightsPanel() {
  const { userType, transactions, goals, budgets, loading } = useFinance()

  const insights = useMemo(
    () => buildInsights(transactions, goals, budgets, userType),
    [transactions, goals, budgets, userType]
  )

  const categories = useMemo(
    () => breakdownByCategory(transactions, budgets),
    [transactions, budgets]
  )

  // Projeção anual a partir da média mensal observada, não de um número fixo.
  const projection = useMemo(() => {
    const now = new Date()
    const months = new Set(
      transactions.map((t) => (t.due_date ?? t.created_at).slice(0, 7))
    )
    const monthCount = Math.max(months.size, 1)

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return {
      monthCount,
      income: (totalIncome / monthCount) * 12,
      expense: (totalExpense / monthCount) * 12,
      balance: ((totalIncome - totalExpense) / monthCount) * 12,
      current: summarizeMonth(transactions, now),
      previous: summarizeMonth(transactions, previousMonth(now)),
    }
  }, [transactions])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-3">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium">Ainda não há dados para analisar</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Registre receitas e despesas em Pagamentos. Os insights são
              calculados a partir dos seus lançamentos reais — nada é estimado
              antes disso.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Insights Inteligentes
          </CardTitle>
          <CardDescription>
            Análises calculadas a partir dos seus lançamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Nada relevante a destacar neste mês. Continue registrando seus
              lançamentos para análises mais precisas.
            </p>
          )}

          {insights.map((insight) => {
            const { icon: Icon, color } = TONE_META[insight.tone]
            return (
              <div
                key={insight.id}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
          <CardDescription>
            {budgets.length > 0
              ? "Comparação entre gastos do mês e orçamento planejado"
              : "Distribuição dos gastos do mês. Defina orçamentos por categoria para acompanhar limites."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Nenhuma despesa registrada neste mês.
            </p>
          )}

          {categories.map((category) => {
            const isOverBudget = category.percentage !== null && category.percentage > 100
            const maxSpent = Math.max(...categories.map((c) => c.spent), 1)
            // Sem orçamento definido, a barra mostra o peso relativo da
            // categoria no total gasto.
            const barValue =
              category.percentage ?? (category.spent / maxSpent) * 100

            return (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.category}</span>
                  <div className="flex items-center gap-2">
                    <span className={isOverBudget ? "text-orange-600" : "text-muted-foreground"}>
                      {formatCurrency(category.spent)}
                      {category.budget !== null && ` / ${formatCurrency(category.budget)}`}
                    </span>
                    {isOverBudget ? (
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                </div>
                <Progress
                  value={Math.min(barValue, 100)}
                  className={`h-2 ${isOverBudget ? "[&>div]:bg-orange-500" : "[&>div]:bg-emerald-500"}`}
                />
                {category.percentage !== null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {formatPercent(category.percentage, 0)} do orçamento
                    </span>
                    {isOverBudget && (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(category.spent - category.budget!)} acima
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Projeção Anual</CardTitle>
          <CardDescription>
            Extrapolação da sua média mensal ao longo de {projection.monthCount}{" "}
            {projection.monthCount === 1 ? "mês registrado" : "meses registrados"}
            {projection.monthCount < 3 && " — a precisão melhora com mais histórico"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProjectionTile
              label={userType === "clt" ? "Receita Anual" : "Faturamento Anual"}
              value={projection.income}
              icon={TrendingUp}
              className="from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"
              accent="text-emerald-600"
            />
            <ProjectionTile
              label="Despesas Anuais"
              value={projection.expense}
              icon={TrendingDown}
              className="from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
              accent="text-orange-600"
            />
            <ProjectionTile
              label={userType === "clt" ? "Economia Anual" : "Lucro Anual"}
              value={projection.balance}
              icon={CheckCircle}
              className="from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
              accent="text-blue-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProjectionTile({
  label,
  value,
  icon: Icon,
  className,
  accent,
}: {
  label: string
  value: number
  icon: typeof TrendingUp
  className: string
  accent: string
}) {
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${accent}`} />
        <span className={`text-sm font-medium ${accent}`}>{label}</span>
      </div>
      <p className="text-2xl font-bold">{formatCurrency(value)}</p>
    </div>
  )
}
