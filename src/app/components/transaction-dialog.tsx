"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTransaction, updateTransaction } from "@/lib/queries"
import { todayISO } from "@/lib/format"
import type { Transaction, TransactionType, UserType } from "@/lib/types"

export const CATEGORIES: Record<UserType, Record<TransactionType, string[]>> = {
  clt: {
    income: ["Salário", "Freelance", "Bônus", "Investimentos", "Outro"],
    expense: [
      "Moradia",
      "Alimentação",
      "Transporte",
      "Saúde",
      "Educação",
      "Lazer",
      "Assinaturas",
      "Outro",
    ],
  },
  mei: {
    income: ["Vendas", "Serviços", "Comissões", "Outro"],
    expense: [
      "Despesa Operacional",
      "Impostos",
      "Fornecedores",
      "Marketing",
      "Equipamentos",
      "Pró-Labore",
      "Outro",
    ],
  },
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userType: UserType
  /** Tipo inicial do lançamento. Ignorado quando `transaction` é informada. */
  defaultType?: TransactionType
  /** Quando presente, o diálogo edita em vez de criar. */
  transaction?: Transaction | null
  onSaved: () => void | Promise<void>
}

export function TransactionDialog({
  open,
  onOpenChange,
  userId,
  userType,
  defaultType = "expense",
  transaction,
  onSaved,
}: TransactionDialogProps) {
  const isEditing = Boolean(transaction)

  const [type, setType] = useState<TransactionType>(defaultType)
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [dueDate, setDueDate] = useState(todayISO())
  const [paid, setPaid] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reidrata o formulário toda vez que o diálogo abre, senão sobra o estado do
  // lançamento anterior.
  useEffect(() => {
    if (!open) return
    setError(null)
    if (transaction) {
      setType(transaction.type)
      setTitle(transaction.title)
      setAmount(String(transaction.amount))
      setCategory(transaction.category)
      setDueDate(transaction.due_date ?? todayISO())
      setPaid(transaction.status === "paid")
      setRecurring(transaction.recurring)
    } else {
      setType(defaultType)
      setTitle("")
      setAmount("")
      setCategory("")
      setDueDate(todayISO())
      setPaid(defaultType === "income")
      setRecurring(false)
    }
  }, [open, transaction, defaultType])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount.replace(",", "."))
    if (!title.trim()) return setError("Informe um título")
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return setError("Informe um valor maior que zero")
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        type,
        category: category || "Outro",
        status: (paid ? "paid" : "pending") as Transaction["status"],
        recurring,
        due_date: dueDate || null,
        paid_date: paid ? dueDate || todayISO() : null,
      }

      if (transaction) {
        await updateTransaction(transaction.id, payload)
      } else {
        await createTransaction(userId, payload)
      }

      await onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lançamento")
    } finally {
      setSaving(false)
    }
  }

  const categories = CATEGORIES[userType][type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? "Editar lançamento"
                : type === "income"
                  ? "Nova receita"
                  : "Nova despesa"}
            </DialogTitle>
            <DialogDescription>
              Os valores do painel são recalculados assim que você salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as TransactionType)
                  setCategory("")
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transaction-title">Título</Label>
              <Input
                id="transaction-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "income" ? "Ex: Salário de março" : "Ex: Aluguel"}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="transaction-amount">Valor (R$)</Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transaction-date">
                  {type === "income" ? "Data" : "Vencimento"}
                </Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={paid}
                  onCheckedChange={(checked) => setPaid(checked === true)}
                />
                {type === "income" ? "Já recebido" : "Já pago"}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={recurring}
                  onCheckedChange={(checked) => setRecurring(checked === true)}
                />
                Recorrente
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
