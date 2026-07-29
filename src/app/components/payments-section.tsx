"use client"

import { useMemo, useState } from "react"
import { Receipt, Plus, Check, Search, MoreHorizontal, Edit, Trash2, Loader2, RotateCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { deleteTransaction, updateTransaction } from "@/lib/queries"
import { formatCurrency, formatDate, parseISODate, todayISO } from "@/lib/format"
import { useFinance } from "../dashboard/finance-context"
import { TransactionDialog } from "./transaction-dialog"
import type { PaymentStatus, Transaction } from "@/lib/types"

/** `overdue` não existe no banco: é pendente com vencimento no passado. */
function statusOf(transaction: Transaction): PaymentStatus {
  if (transaction.status === "paid") return "paid"
  if (!transaction.due_date) return "pending"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseISODate(transaction.due_date) < today ? "overdue" : "pending"
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  overdue: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
}

export function PaymentsSection() {
  const { profile, userType, transactions, loading, refresh } = useFinance()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>("all")
  const [filterType, setFilterType] = useState<"all" | Transaction["type"]>("all")

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false
      if (filterStatus !== "all" && statusOf(t) !== filterStatus) return false
      if (term && !t.title.toLowerCase().includes(term) && !t.category.toLowerCase().includes(term)) {
        return false
      }
      return true
    })
  }, [transactions, search, filterStatus, filterType])

  const totals = useMemo(() => {
    const pending = transactions.filter(
      (t) => t.type === "expense" && t.status === "pending"
    )
    const overdue = pending.filter((t) => statusOf(t) === "overdue")
    const paid = transactions.filter(
      (t) => t.type === "expense" && t.status === "paid"
    )
    const sum = (list: Transaction[]) =>
      list.reduce((total, t) => total + Number(t.amount), 0)

    return {
      pending: sum(pending),
      pendingCount: pending.length,
      overdue: sum(overdue),
      overdueCount: overdue.length,
      paid: sum(paid),
      paidCount: paid.length,
    }
  }, [transactions])

  const togglePaid = async (transaction: Transaction) => {
    setTogglingId(transaction.id)
    try {
      const nextStatus = transaction.status === "paid" ? "pending" : "paid"
      await updateTransaction(transaction.id, {
        status: nextStatus,
        paid_date: nextStatus === "paid" ? todayISO() : null,
      })
      await refresh()
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteTransaction(toDelete.id)
      await refresh()
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Em aberto"
          amount={totals.pending}
          count={totals.pendingCount}
          className="from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
        />
        <SummaryCard
          label="Vencido"
          amount={totals.overdue}
          count={totals.overdueCount}
          className="from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
        />
        <SummaryCard
          label="Pago"
          amount={totals.paid}
          count={totals.paidCount}
          className="from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"
        />
      </div>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {userType === "clt" ? "Contas e Pagamentos" : "Contas do Negócio"}
              </CardTitle>
              <CardDescription className="mt-1">
                Todos os seus lançamentos de entrada e saída
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou categoria"
                className="pl-9"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as typeof filterType)}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entradas e saídas</SelectItem>
                <SelectItem value="income">Só receitas</SelectItem>
                <SelectItem value="expense">Só despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && (
            <>
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </>
          )}

          {!loading && transactions.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">Nenhum lançamento cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Registre suas receitas e contas para acompanhar o fluxo do mês.
                </p>
              </div>
            </div>
          )}

          {!loading && transactions.length > 0 && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento corresponde aos filtros aplicados.
            </p>
          )}

          {!loading &&
            filtered.map((transaction) => {
              const status = statusOf(transaction)
              const isIncome = transaction.type === "income"

              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-all duration-300"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => togglePaid(transaction)}
                    disabled={togglingId === transaction.id}
                    aria-label={
                      transaction.status === "paid"
                        ? "Marcar como pendente"
                        : "Marcar como pago"
                    }
                    className={`h-9 w-9 flex-shrink-0 ${
                      transaction.status === "paid"
                        ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
                        : ""
                    }`}
                  >
                    {togglingId === transaction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{transaction.title}</p>
                      {transaction.recurring && (
                        <RotateCw
                          className="h-3 w-3 text-muted-foreground"
                          aria-label="Recorrente"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category}
                      </Badge>
                      <Badge className={`text-xs border-0 ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </Badge>
                      {transaction.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {isIncome ? "Recebimento" : "Vence"} em{" "}
                          {formatDate(transaction.due_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    className={`font-semibold whitespace-nowrap ${
                      isIncome ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {isIncome ? "+" : "−"} {formatCurrency(Number(transaction.amount))}
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Ações do lançamento">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(transaction)
                          setDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setToDelete(transaction)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={profile.id}
        userType={userType}
        transaction={editing}
        onSaved={refresh}
      />

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toDelete?.title}&quot; será removido permanentemente.
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

function SummaryCard({
  label,
  amount,
  count,
  className,
}: {
  label: string
  amount: number
  count: number
  className: string
}) {
  return (
    <Card className={`border-0 bg-gradient-to-br ${className}`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{formatCurrency(amount)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {count} lançamento{count === 1 ? "" : "s"}
        </p>
      </CardContent>
    </Card>
  )
}
