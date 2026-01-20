"use client"

import { TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign, ArrowUpRight, ArrowDownRight, Building2, Briefcase, FileText, Receipt } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UserType } from "../page"

interface FinancialOverviewProps {
  userType: UserType
}

export function FinancialOverview({ userType }: FinancialOverviewProps) {
  const cltCards = [
    {
      title: "Salário Líquido",
      value: "R$ 8.500,00",
      change: "+5,2%",
      trend: "up",
      icon: Wallet,
      color: "from-emerald-500 to-emerald-600",
      description: "Após descontos"
    },
    {
      title: "Receitas Extras",
      value: "R$ 1.200,00",
      change: "+18,5%",
      trend: "up",
      icon: TrendingUp,
      color: "from-blue-500 to-blue-600",
      description: "Freelances e bônus"
    },
    {
      title: "Despesas Totais",
      value: "R$ 5.240,00",
      change: "-3,1%",
      trend: "down",
      icon: TrendingDown,
      color: "from-orange-500 to-orange-600",
      description: "Fixas + variáveis"
    },
    {
      title: "Economia Mensal",
      value: "R$ 4.460,00",
      change: "+22,8%",
      trend: "up",
      icon: PiggyBank,
      color: "from-purple-500 to-purple-600",
      description: "46% do salário"
    }
  ]

  const meiCards = [
    {
      title: "Faturamento Mensal",
      value: "R$ 15.800,00",
      change: "+12,5%",
      trend: "up",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      description: "Receita bruta"
    },
    {
      title: "Despesas Operacionais",
      value: "R$ 4.200,00",
      change: "+5,2%",
      trend: "up",
      icon: Receipt,
      color: "from-orange-500 to-orange-600",
      description: "Custos do negócio"
    },
    {
      title: "Lucro Líquido",
      value: "R$ 11.600,00",
      change: "+15,8%",
      trend: "up",
      icon: TrendingUp,
      color: "from-blue-500 to-blue-600",
      description: "Após impostos"
    },
    {
      title: "Reserva Empresarial",
      value: "R$ 28.400,00",
      change: "+8,3%",
      trend: "up",
      icon: Building2,
      color: "from-purple-500 to-purple-600",
      description: "Capital de giro"
    }
  ]

  const cards = userType === "clt" ? cltCards : meiCards

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
              ? "Acompanhe seu salário, benefícios e economia mensal" 
              : "Gerencie seu faturamento, despesas e lucro empresarial"}
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 border-emerald-600 text-emerald-600">
          {userType === "clt" ? "Regime CLT" : "MEI Ativo"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          const TrendIcon = card.trend === "up" ? ArrowUpRight : ArrowDownRight
          
          return (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-900 group">
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
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${card.trend === "up" ? "text-emerald-600" : "text-orange-600"}`} />
                    <span className={`text-sm font-medium ${card.trend === "up" ? "text-emerald-600" : "text-orange-600"}`}>
                      {card.change}
                    </span>
                    <span className="text-sm text-muted-foreground">vs mês anterior</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 bg-white dark:bg-slate-900 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso Mensal</CardTitle>
            <span className="text-sm text-muted-foreground">38% do mês</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {userType === "clt" ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Receitas Totais</span>
                  <span className="font-medium">R$ 9.700 / R$ 10.000</span>
                </div>
                <Progress value={97} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-medium">R$ 5.240 / R$ 7.000</span>
                </div>
                <Progress value={75} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta de Economia</span>
                  <span className="font-medium">R$ 4.460 / R$ 4.000</span>
                </div>
                <Progress value={111} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Faturamento</span>
                  <span className="font-medium">R$ 15.800 / R$ 20.000</span>
                </div>
                <Progress value={79} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Despesas Operacionais</span>
                  <span className="font-medium">R$ 4.200 / R$ 6.000</span>
                </div>
                <Progress value={70} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta de Lucro</span>
                  <span className="font-medium">R$ 11.600 / R$ 12.000</span>
                </div>
                <Progress value={97} className="h-2 bg-slate-200 dark:bg-slate-800" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
