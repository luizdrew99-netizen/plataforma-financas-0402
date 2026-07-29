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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createGoal, updateGoal } from "@/lib/queries"
import type { FinancialGoal, UserType } from "@/lib/types"

export const GOAL_CATEGORIES: Record<UserType, string[]> = {
  clt: ["Poupança", "Investimento", "Viagem", "Compra", "Educação", "Outro"],
  mei: [
    "Investimento",
    "Capital de Giro",
    "Infraestrutura",
    "Capacitação",
    "Expansão",
    "Outro",
  ],
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userType: UserType
  goal?: FinancialGoal | null
  onSaved: () => void | Promise<void>
}

export function GoalDialog({
  open,
  onOpenChange,
  userId,
  userType,
  goal,
  onSaved,
}: GoalDialogProps) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [target, setTarget] = useState("")
  const [current, setCurrent] = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (goal) {
      setTitle(goal.title)
      setCategory(goal.category)
      setTarget(String(goal.target_amount))
      setCurrent(String(goal.current_amount))
      setDeadline(goal.deadline ?? "")
    } else {
      setTitle("")
      setCategory("")
      setTarget("")
      setCurrent("")
      setDeadline("")
    }
  }, [open, goal])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const targetAmount = Number(target.replace(",", "."))
    const currentAmount = Number((current || "0").replace(",", "."))

    if (!title.trim()) return setError("Informe um título")
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return setError("O valor alvo precisa ser maior que zero")
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      return setError("O valor já guardado não pode ser negativo")
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        category: category || "Outro",
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline: deadline || null,
      }

      if (goal) {
        await updateGoal(goal.id, payload)
      } else {
        await createGoal(userId, payload)
      }

      await onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar meta")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{goal ? "Editar meta" : "Criar nova meta"}</DialogTitle>
            <DialogDescription>
              Defina o alvo e acompanhe o progresso ao longo do tempo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-title">Título da meta</Label>
              <Input
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  userType === "clt" ? "Ex: Viagem para Europa" : "Ex: Expansão do negócio"
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES[userType].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="goal-target">Valor alvo (R$)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal-current">Já guardado (R$)</Label>
                <Input
                  id="goal-current"
                  type="number"
                  step="0.01"
                  min="0"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="goal-deadline">Data limite (opcional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
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
              {goal ? "Salvar" : "Criar meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
