"use client"

import { Plus, DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserType } from "../page"

interface QuickActionsProps {
  userType: UserType
}

export function QuickActions({ userType }: QuickActionsProps) {
  const cltActions = [
    {
      title: "Adicionar Receita",
      description: "Salário ou extra",
      icon: TrendingUp,
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "Adicionar Despesa",
      description: "Conta ou compra",
      icon: CreditCard,
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Transferir",
      description: "Entre contas",
      icon: Wallet,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Nova Meta",
      description: "Criar objetivo",
      icon: Plus,
      color: "from-purple-500 to-purple-600"
    }
  ]

  const meiActions = [
    {
      title: "Registrar Venda",
      description: "Nova receita",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "Despesa Operacional",
      description: "Custo do negócio",
      icon: CreditCard,
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Pró-Labore",
      description: "Retirada mensal",
      icon: Wallet,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Nova Meta",
      description: "Objetivo empresarial",
      icon: Plus,
      color: "from-purple-500 to-purple-600"
    }
  ]

  const actions = userType === "clt" ? cltActions : meiActions

  return (
    <Card className="border-0 bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant="outline"
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
  )
}
