"use client"

import { TrendingUp, TrendingDown, Lightbulb, AlertCircle, CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function InsightsPanel() {
  const insights = [
    {
      id: "1",
      type: "success",
      title: "Economia acima da meta!",
      description: "Você economizou 8% a mais que o planejado este mês. Continue assim!",
      icon: CheckCircle,
      color: "from-emerald-500 to-emerald-600",
      action: "Ver detalhes"
    },
    {
      id: "2",
      type: "warning",
      title: "Despesas com alimentação aumentaram",
      description: "Suas despesas com alimentação subiram 15% em relação ao mês passado.",
      icon: AlertCircle,
      color: "from-orange-500 to-orange-600",
      action: "Analisar gastos"
    },
    {
      id: "3",
      type: "tip",
      title: "Oportunidade de investimento",
      description: "Com base no seu perfil, você pode investir R$ 500 em renda fixa este mês.",
      icon: Lightbulb,
      color: "from-blue-500 to-blue-600",
      action: "Ver sugestões"
    },
    {
      id: "4",
      type: "info",
      title: "Meta de viagem no prazo",
      description: "Mantendo o ritmo atual, você atingirá sua meta de viagem 2 meses antes!",
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      action: "Ver progresso"
    }
  ]

  const recommendations = [
    {
      title: "Reduza gastos com delivery",
      description: "Economize até R$ 400/mês cozinhando em casa",
      savings: 400,
      impact: "high"
    },
    {
      title: "Cancele assinaturas não utilizadas",
      description: "3 serviços sem uso nos últimos 60 dias",
      savings: 120,
      impact: "medium"
    },
    {
      title: "Aproveite cashback",
      description: "Ative cashback em compras do supermercado",
      savings: 80,
      impact: "low"
    }
  ]

  const categoryAnalysis = [
    { name: "Alimentação", spent: 1200, budget: 1000, percentage: 120 },
    { name: "Transporte", spent: 450, budget: 600, percentage: 75 },
    { name: "Lazer", spent: 300, budget: 400, percentage: 75 },
    { name: "Saúde", spent: 200, budget: 300, percentage: 67 },
    { name: "Educação", spent: 500, budget: 500, percentage: 100 }
  ]

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Insights Inteligentes
          </CardTitle>
          <CardDescription>
            Análises automáticas baseadas no seu comportamento financeiro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight) => {
            const Icon = insight.icon
            return (
              <div
                key={insight.id}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${insight.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.description}
                    </p>
                    <Button variant="outline" size="sm" className="gap-2">
                      {insight.action}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg">Recomendações de Economia</CardTitle>
            <CardDescription>
              Sugestões personalizadas para otimizar suas finanças
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => {
              const impactColors = {
                high: "from-emerald-500 to-emerald-600",
                medium: "from-blue-500 to-blue-600",
                low: "from-purple-500 to-purple-600"
              }

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge className={`bg-gradient-to-r ${impactColors[rec.impact as keyof typeof impactColors]} text-white border-0`}>
                      R$ {rec.savings}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg">Análise por Categoria</CardTitle>
            <CardDescription>
              Comparação entre gastos e orçamento planejado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryAnalysis.map((category, index) => {
              const isOverBudget = category.percentage > 100
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={isOverBudget ? "text-orange-600" : "text-muted-foreground"}>
                        R$ {category.spent} / R$ {category.budget}
                      </span>
                      {isOverBudget ? (
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={category.percentage}
                    className={`h-2 ${isOverBudget ? "[&>div]:bg-orange-500" : "[&>div]:bg-emerald-500"}`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {category.percentage}% do orçamento
                    </span>
                    {isOverBudget && (
                      <span className="text-orange-600 font-medium">
                        +R$ {category.spent - category.budget} acima
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Projeção Anual</CardTitle>
          <CardDescription>
            Estimativa baseada no seu comportamento atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">Receita Anual</span>
              </div>
              <p className="text-2xl font-bold">R$ 102.000</p>
              <p className="text-xs text-muted-foreground mt-1">+8% vs ano anterior</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">Despesas Anuais</span>
              </div>
              <p className="text-2xl font-bold">R$ 62.880</p>
              <p className="text-xs text-muted-foreground mt-1">-3% vs ano anterior</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Economia Anual</span>
              </div>
              <p className="text-2xl font-bold">R$ 39.120</p>
              <p className="text-xs text-muted-foreground mt-1">+18% vs ano anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
