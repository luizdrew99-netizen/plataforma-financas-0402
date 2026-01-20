"use client"

import { useState } from "react"
import { Target, Plus, TrendingUp, Plane, ShoppingBag, Home, GraduationCap, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserType } from "../page"

interface Goal {
  id: string
  title: string
  category: string
  target: number
  current: number
  deadline: string
  icon: any
  color: string
}

interface GoalsSectionProps {
  expanded?: boolean
  userType: UserType
}

export function GoalsSection({ expanded = false, userType }: GoalsSectionProps) {
  const cltGoals: Goal[] = [
    {
      id: "1",
      title: "Viagem para Europa",
      category: "Viagem",
      target: 15000,
      current: 8500,
      deadline: "2024-12-31",
      icon: Plane,
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "2",
      title: "Fundo de Emergência",
      category: "Poupança",
      target: 30000,
      current: 22000,
      deadline: "2024-06-30",
      icon: Home,
      color: "from-emerald-500 to-emerald-600"
    },
    {
      id: "3",
      title: "Novo Notebook",
      category: "Compra",
      target: 5000,
      current: 3200,
      deadline: "2024-04-30",
      icon: ShoppingBag,
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "4",
      title: "Curso de Especialização",
      category: "Educação",
      target: 8000,
      current: 2400,
      deadline: "2024-08-31",
      icon: GraduationCap,
      color: "from-orange-500 to-orange-600"
    }
  ]

  const meiGoals: Goal[] = [
    {
      id: "1",
      title: "Expansão do Negócio",
      category: "Investimento",
      target: 50000,
      current: 28000,
      deadline: "2024-12-31",
      icon: TrendingUp,
      color: "from-emerald-500 to-emerald-600"
    },
    {
      id: "2",
      title: "Reserva de Emergência",
      category: "Capital de Giro",
      target: 40000,
      current: 28400,
      deadline: "2024-06-30",
      icon: Home,
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "3",
      title: "Novos Equipamentos",
      category: "Infraestrutura",
      target: 15000,
      current: 7200,
      deadline: "2024-05-31",
      icon: ShoppingBag,
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "4",
      title: "Curso Profissionalizante",
      category: "Capacitação",
      target: 5000,
      current: 1800,
      deadline: "2024-07-31",
      icon: GraduationCap,
      color: "from-orange-500 to-orange-600"
    }
  ]

  const [goals, setGoals] = useState<Goal[]>(userType === "clt" ? cltGoals : meiGoals)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: "",
    category: "",
    target: "",
    deadline: ""
  })

  const handleAddGoal = () => {
    // Lógica para adicionar nova meta
    setIsDialogOpen(false)
    setNewGoal({ title: "", category: "", target: "", deadline: "" })
  }

  const displayGoals = expanded ? goals : goals.slice(0, 3)

  return (
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
                <DialogDescription>
                  Defina uma nova meta financeira para acompanhar seu progresso
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título da Meta</Label>
                  <Input
                    id="title"
                    placeholder={userType === "clt" ? "Ex: Viagem para Europa" : "Ex: Expansão do Negócio"}
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={newGoal.category} onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {userType === "clt" ? (
                        <>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="viagem">Viagem</SelectItem>
                          <SelectItem value="compra">Compra</SelectItem>
                          <SelectItem value="educacao">Educação</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="capital">Capital de Giro</SelectItem>
                          <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                          <SelectItem value="capacitacao">Capacitação</SelectItem>
                          <SelectItem value="expansao">Expansão</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="target">Valor Alvo (R$)</Label>
                  <Input
                    id="target"
                    type="number"
                    placeholder="0,00"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Data Limite</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddGoal} className="bg-emerald-600 hover:bg-emerald-700">
                  Criar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayGoals.map((goal) => {
          const Icon = goal.icon
          const progress = (goal.current / goal.target) * 100
          const remaining = goal.target - goal.current
          const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div key={goal.id} className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${goal.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {goal.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Prazo expirado"}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
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
                    R$ {goal.current.toLocaleString('pt-BR')} / R$ {goal.target.toLocaleString('pt-BR')}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{progress.toFixed(1)}% concluído</span>
                  <span className="text-muted-foreground">Faltam R$ {remaining.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {progress >= 100 && (
                <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950 rounded-md flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-600 font-medium">Meta atingida! 🎉</span>
                </div>
              )}
            </div>
          )
        })}

        {!expanded && goals.length > 3 && (
          <Button variant="outline" className="w-full" onClick={() => {}}>
            Ver todas as {goals.length} metas
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
