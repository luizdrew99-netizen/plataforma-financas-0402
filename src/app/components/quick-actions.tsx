"use client"

import { useState } from "react"
import { Plus, DollarSign, TrendingUp, CreditCard, CalendarPlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFinance } from "../dashboard/finance-context"
import { TransactionDialog } from "./transaction-dialog"
import { GoalDialog } from "./goal-dialog"
import { CalendarEventDialog } from "./calendar-event-dialog"
import type { TransactionType } from "@/lib/types"

type ActiveDialog = "transaction" | "goal" | "event" | null

export function QuickActions() {
  const { profile, userType, refresh } = useFinance()
  const [dialog, setDialog] = useState<ActiveDialog>(null)
  const [transactionType, setTransactionType] = useState<TransactionType>("expense")

  const openTransaction = (type: TransactionType) => {
    setTransactionType(type)
    setDialog("transaction")
  }

  const actions = [
    {
      title: userType === "clt" ? "Adicionar Receita" : "Registrar Venda",
      description: userType === "clt" ? "Salário ou extra" : "Nova receita",
      icon: userType === "clt" ? TrendingUp : DollarSign,
      color: "from-emerald-500 to-emerald-600",
      onClick: () => openTransaction("income"),
    },
    {
      title: userType === "clt" ? "Adicionar Despesa" : "Despesa Operacional",
      description: userType === "clt" ? "Conta ou compra" : "Custo do negócio",
      icon: CreditCard,
      color: "from-orange-500 to-orange-600",
      onClick: () => openTransaction("expense"),
    },
    {
      title: "Novo Compromisso",
      description: "Lembrete na agenda",
      icon: CalendarPlus,
      color: "from-blue-500 to-blue-600",
      onClick: () => setDialog("event"),
    },
    {
      title: "Nova Meta",
      description: userType === "clt" ? "Criar objetivo" : "Objetivo empresarial",
      icon: Plus,
      color: "from-purple-500 to-purple-600",
      onClick: () => setDialog("goal"),
    },
  ]

  return (
    <>
      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant="outline"
                onClick={action.onClick}
                className="w-full justify-start h-auto p-4 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Button>
            )
          })}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialog === "transaction"}
        onOpenChange={(open) => setDialog(open ? "transaction" : null)}
        userId={profile.id}
        userType={userType}
        defaultType={transactionType}
        onSaved={refresh}
      />

      <GoalDialog
        open={dialog === "goal"}
        onOpenChange={(open) => setDialog(open ? "goal" : null)}
        userId={profile.id}
        userType={userType}
        onSaved={refresh}
      />

      <CalendarEventDialog
        open={dialog === "event"}
        onOpenChange={(open) => setDialog(open ? "event" : null)}
        userId={profile.id}
        onSaved={refresh}
      />
    </>
  )
}
