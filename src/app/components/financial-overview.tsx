"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign, ArrowUpRight, ArrowDownRight, Building2, Briefcase, Receipt, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatPercent } from "@/lib/format"
import { percentChange, previousMonth, summarizeMonth } from "@/lib/finance"
import { useFinance } from "../dashboard/finance-context"

export function FinancialOverview() {
  const { userType, transactions, goals, loading } = useFinance()

  const { current, previous } = useMemo(() => {
    const now = new Date()
    return {
      current: summarizeMonth(transactions, now),
      previous: summarizeMonth(transactions, previousMonth(now)),
    }
  }, [transactions])

  const goalsSaved = useMemo(
    () => goals.reduce((total, g) => total + Number(g.current_amount), 0),
    [goals]
  )

  const cards = useMemo(() => {
    const incomeLabel = userType === "clt" ? "Receitas do Mês" : "Faturamento Mensal"
    const expenseLabel =
      userType === "clt" ? "Despesas Totais" : "Despesas Operacionais"
    const balanceLabel = userType === "clt" ? "Economia do Mês" : "Lucro Líquido"

    return [
      {
        title: incomeLabel,
        value: current.income,
        change: percentChange(current.income, previous.income),
        positiveIsGood: true,
        icon: userType === "clt" ? Wallet : DollarSign,
        color: "from-emerald-500 to-emerald-600",
        description:
          userType === "clt" ? "Salário e extras" : "Receita bruta do período",
      },
      {
        title: expenseLabel,
        value: current.expense,
        change: percentChange(current.expense, previous.expense),
        positiveIsGood: false,
        icon: userType === "clt" ? TrendingDown : Receipt,
        color: "from-orange-500 to-orange-600",
        description:
          current.pendingExpense > 0
            ? `${formatCurrency(current.pendingExpense)} ainda em aberto`
            : "Tudo quitado no mês",
      },
      {
        title: balanceLabel,
        value: current.balance,
        change: percentChange(current.balance, previous.balance),
        positiveIsGood: true,
        icon: TrendingUp,
        color: "from-blue-500 to-blue-600",
        description:
          current.income > 0
            ? `${formatPercent(current.savingsRate, 0)} do que entrou`
            : "Sem receitas registradas",
      },
      {
        title: userType === "clt" ? "Guardado em Metas" : "Reserva Empresarial",
        value: goalsSaved,
        change: null,
        positiveIsGood: true,
        icon: userType === "clt" ? PiggyBank : Building2,
        color: "from-purple-500 to-purple-600",
        description: `${goals.length} meta${goals.length === 1 ? "" : "s"} ativa${goals.length === 1 ? "" : "s"}`,
      },
    ]
  }, [current, previous, userType, goalsSaved, goals.length])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  const hasData = transactions.length > 0 || goals.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {userType === "clt" ? (
              <>
                <Briefcase className="h-6 w-6 text-emerald-600" />
                Visão Geral - Profissional CLT
              </>
            ) : (
              <>
                <Building2 className="h-6 w-6 text-emerald-600" />
                Visão Geral - Microempreendedor MEI
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {userType === "clt"
              ? "Acompanhe suas receitas, despesas e economia do mês"
              : "Gerencie seu faturamento, despesas e lucro do mês"}
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 border-emerald-600 text-emerald-600">
          {userType === "clt" ? "Regime CLT" : "MEI Ativo"}
        </Badge>
      </div>

      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-2">
            <p className="font-medium">Nenhum lançamento ainda</p>
            <p className="text-sm text-muted-foreground">
              Use as Ações Rápidas ao lado para registrar sua primeira receita ou
              despesa — os números abaixo passam a refletir seus dados na hora.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          const isUp = (card.change ?? 0) > 0
          const TrendIcon =
            card.change === null ? Minus : isUp ? ArrowUpRight : ArrowDownRight
          // Despesa subindo é ruim, receita subindo é boa — a cor segue o
          // significado, não a direção da seta.
          const isGood = card.change === null ? true : isUp === card.positiveIsGood
          const trendColor = isGood ? "text-emerald-600" : "text-orange-600"

          return (
            <Card key={card.title} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-900 group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{formatCurrency(card.value)}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    <span className={`text-sm font-medium ${trendColor}`}>
                      {card.change === null
                        ? "—"
                        : `${isUp ? "+" : ""}${formatPercent(card.change)}`}
                    </span>
                    <span className="text-sm text-muted-foreground">vs mês anterior</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {goals.length > 0 && (
        <Card className="border-0 bg-white dark:bg-slate-900 shadow-lg">
          <CardHeader>
            <CardTitle>Progresso das Metas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.slice(0, 3).map((goal) => {
              const target = Number(goal.target_amount)
              const saved = Number(goal.current_amount)
              const progress = target > 0 ? (saved / target) * 100 : 0

              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{goal.title}</span>
                    <span className="font-medium">
                      {formatCurrency(saved)} / {formatCurrency(target)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(progress, 100)}
                    className="h-2 bg-slate-200 dark:bg-slate-800"
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
