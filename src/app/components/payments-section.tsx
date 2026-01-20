"use client"

import { useState } from "react"
import { Receipt, Plus, Check, X, Calendar, DollarSign, Building2, Briefcase, Filter, Search, MoreHorizontal, Edit, Trash2, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

interface Payment {
  id: string
  title: string
  category: string
  amount: number
  dueDate: string
  status: "pending" | "paid" | "overdue"
  type: "expense" | "income"
  recurring: boolean
}

interface PaymentsSectionProps {
  userType: UserType
}

export function PaymentsSection({ userType }: PaymentsSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "1",
      title: userType === "clt" ? "Aluguel" : "Aluguel do Escritório",
      category: userType === "clt" ? "Moradia" : "Despesa Operacional",
      amount: userType === "clt" ? 1800 : 2500,
      dueDate: "2024-01-10",
      status: "paid",
      type: "expense",
      recurring: true
    },
    {
      id: "2",
      title: userType === "clt" ? "Salário" : "Pagamento Cliente A",
      category: userType === "clt" ? "Receita Fixa" : "Receita de Serviços",
      amount: userType === "clt" ? 8500 : 5800,
      dueDate: "2024-01-05",
      status: "paid",
      type: "income",
      recurring: true
    },
    {
      id: "3",
      title: userType === "clt" ? "Conta de Luz" : "Fornecedor de Materiais",
      category: userType === "clt" ? "Utilidades" : "Despesa Operacional",
      amount: userType === "clt" ? 280 : 1200,
      dueDate: "2024-01-15",
      status: "pending",
      type: "expense",
      recurring: true
    },
    {
      id: "4",
      title: userType === "clt" ? "Internet" : "Assinatura Software",
      category: userType === "clt" ? "Utilidades" : "Tecnologia",
      amount: userType === "clt" ? 120 : 450,
      dueDate: "2024-01-20",
      status: "pending",
      type: "expense",
      recurring: true
    },
    {
      id: "5",
      title: userType === "clt" ? "Freelance Design" : "Pagamento Cliente B",
      category: userType === "clt" ? "Receita Extra" : "Receita de Serviços",
      amount: userType === "clt" ? 1200 : 3500,
      dueDate: "2024-01-18",
      status: "pending",
      type: "income",
      recurring: false
    },
    {
      id: "6",
      title: userType === "clt" ? "Cartão de Crédito" : "DAS MEI",
      category: userType === "clt" ? "Crédito" : "Impostos",
      amount: userType === "clt" ? 2400 : 67,
      dueDate: "2024-01-25",
      status: "pending",
      type: "expense",
      recurring: true
    },
    {
      id: "7",
      title: userType === "clt" ? "Plano de Saúde" : "Contador",
      category: userType === "clt" ? "Saúde" : "Serviços Profissionais",
      amount: userType === "clt" ? 450 : 300,
      dueDate: "2024-01-08",
      status: "overdue",
      type: "expense",
      recurring: true
    }
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "overdue">("all")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")

  const togglePaymentStatus = (id: string) => {
    setPayments(payments.map(payment => {
      if (payment.id === id) {
        return {
          ...payment,
          status: payment.status === "paid" ? "pending" : "paid"
        }
      }
      return payment
    }))
  }

  const filteredPayments = payments.filter(payment => {
    if (filterStatus !== "all" && payment.status !== filterStatus) return false
    if (filterType !== "all" && payment.type !== filterType) return false
    return true
  })

  const totalIncome = payments.filter(p => p.type === "income" && p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const totalExpense = payments.filter(p => p.type === "expense" && p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const pendingPayments = payments.filter(p => p.status === "pending").length
  const overduePayments = payments.filter(p => p.status === "overdue").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {userType === "clt" ? (
              <>
                <Briefcase className="h-6 w-6 text-emerald-600" />
                Pagamentos - CLT
              </>
            ) : (
              <>
                <Building2 className="h-6 w-6 text-emerald-600" />
                Pagamentos - MEI
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {userType === "clt" 
              ? "Gerencie suas contas pessoais e receitas extras" 
              : "Controle receitas de clientes e despesas empresariais"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Novo Pagamento</DialogTitle>
              <DialogDescription>
                Adicione uma nova receita ou despesa ao seu controle financeiro
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Descrição</Label>
                <Input id="title" placeholder="Ex: Aluguel, Salário, Freelance..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input id="amount" type="number" placeholder="0,00" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {userType === "clt" ? (
                      <>
                        <SelectItem value="moradia">Moradia</SelectItem>
                        <SelectItem value="utilidades">Utilidades</SelectItem>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="receita-fixa">Receita Fixa</SelectItem>
                        <SelectItem value="receita-extra">Receita Extra</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="operacional">Despesa Operacional</SelectItem>
                        <SelectItem value="impostos">Impostos</SelectItem>
                        <SelectItem value="tecnologia">Tecnologia</SelectItem>
                        <SelectItem value="servicos">Receita de Serviços</SelectItem>
                        <SelectItem value="produtos">Receita de Produtos</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input id="dueDate" type="date" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-50">
              Receitas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {totalIncome.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-emerald-50 mt-1">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-50">
              Despesas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {totalExpense.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-orange-50 mt-1">Total pago</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-50">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingPayments}</p>
            <p className="text-xs text-blue-50 mt-1">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-50">
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overduePayments}</p>
            <p className="text-xs text-red-50 mt-1">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Lista de Pagamentos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredPayments.map((payment) => {
            const isIncome = payment.type === "income"
            const isPaid = payment.status === "paid"
            const isOverdue = payment.status === "overdue"

            return (
              <div
                key={payment.id}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  isPaid 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900" 
                    : isOverdue
                    ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={isPaid}
                      onCheckedChange={() => togglePaymentStatus(payment.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${isPaid ? "line-through text-muted-foreground" : ""}`}>
                          {payment.title}
                        </h3>
                        {payment.recurring && (
                          <Badge variant="outline" className="text-xs">
                            Recorrente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {payment.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isIncome 
                          ? "text-emerald-600" 
                          : "text-orange-600"
                      }`}>
                        {isIncome ? "+" : "-"} R$ {payment.amount.toLocaleString('pt-BR')}
                      </p>
                      <Badge 
                        variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"}
                        className={`text-xs ${isPaid ? "bg-emerald-600" : ""}`}
                      >
                        {isPaid ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => togglePaymentStatus(payment.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {isPaid ? "Marcar como pendente" : "Marcar como pago"}
                        </DropdownMenuItem>
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
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
