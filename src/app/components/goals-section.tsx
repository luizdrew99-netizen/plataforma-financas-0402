"use client"

import { useState } from "react"
import { Target, Plus, TrendingUp, Plane, ShoppingBag, Home, GraduationCap, MoreHorizontal, Edit, Trash2, Wallet, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteGoal } from "@/lib/queries"
import { formatCurrency, formatPercent, daysUntil } from "@/lib/format"
import { useFinance } from "../dashboard/finance-context"
import { GoalDialog } from "./goal-dialog"
import type { FinancialGoal } from "@/lib/types"

interface GoalsSectionProps {
  expanded?: boolean
}

const CATEGORY_STYLES: { match: RegExp; icon: typeof Target; color: string }[] = [
  { match: /viagem/i, icon: Plane, color: "from-blue-500 to-blue-600" },
  { match: /poupan|capital|reserva/i, icon: Home, color: "from-emerald-500 to-emerald-600" },
  { match: /compra|infraestrutura|equipa/i, icon: ShoppingBag, color: "from-purple-500 to-purple-600" },
  { match: /educa|capacita/i, icon: GraduationCap, color: "from-orange-500 to-orange-600" },
  { match: /invest|expans/i, icon: TrendingUp, color: "from-teal-500 to-teal-600" },
]

function styleForCategory(category: string) {
  return (
    CATEGORY_STYLES.find((style) => style.match.test(category)) ?? {
      icon: Wallet,
      color: "from-slate-500 to-slate-600",
    }
  )
}

export function GoalsSection({ expanded = false }: GoalsSectionProps) {
  const { profile, userType, goals, loading, refresh } = useFinance()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<FinancialGoal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const displayGoals = expanded || showAll ? goals : goals.slice(0, 3)

  const openCreate = () => {
    setEditingGoal(null)
    setDialogOpen(true)
  }

  const openEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!goalToDelete) return
    setDeleting(true)
    try {
      await deleteGoal(goalToDelete.id)
      await refresh()
      setGoalToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {userType === "clt" ? "Minhas Metas Financeiras" : "Metas Empresariais"}
              </CardTitle>
              <CardDescription className="mt-1">
                {userType === "clt"
                  ? "Acompanhe o progresso das suas metas pessoais"
                  : "Monitore os objetivos do seu negócio"}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={openCreate}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && (
            <>
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </>
          )}

          {!loading && goals.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <Target className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">Você ainda não tem metas</p>
                <p className="text-sm text-muted-foreground">
                  Crie a primeira para começar a acompanhar seu progresso.
                </p>
              </div>
              <Button variant="outline" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar meta
              </Button>
            </div>
          )}

          {!loading &&
            displayGoals.map((goal) => {
              const target = Number(goal.target_amount)
              const saved = Number(goal.current_amount)
              const progress = target > 0 ? (saved / target) * 100 : 0
              const remaining = Math.max(target - saved, 0)
              const { icon: Icon, color } = styleForCategory(goal.category)
              const remainingDays = goal.deadline ? daysUntil(goal.deadline) : null

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {goal.category}
                          </Badge>
                          {remainingDays !== null && (
                            <span className="text-xs text-muted-foreground">
                              {remainingDays > 0
                                ? `${remainingDays} dias restantes`
                                : remainingDays === 0
                                  ? "Vence hoje"
                                  : "Prazo expirado"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da meta">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(goal)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setGoalToDelete(goal)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {formatCurrency(saved)} / {formatCurrency(target)}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatPercent(progress)} concluído
                      </span>
                      <span className="text-muted-foreground">
                        Faltam {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {progress >= 100 && (
                    <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950 rounded-md flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-600 font-medium">
                        Meta atingida! 🎉
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

          {!loading && !expanded && !showAll && goals.length > 3 && (
            <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
              Ver todas as {goals.length} metas
            </Button>
          )}
        </CardContent>
      </Card>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={profile.id}
        userType={userType}
        goal={editingGoal}
        onSaved={refresh}
      />

      <AlertDialog
        open={goalToDelete !== null}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{goalToDelete?.title}&quot; será removida permanentemente. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
