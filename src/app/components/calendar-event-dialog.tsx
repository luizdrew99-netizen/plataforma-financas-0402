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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCalendarEvent, updateCalendarEvent } from "@/lib/queries"
import { todayISO } from "@/lib/format"
import type { CalendarEvent, CalendarEventType } from "@/lib/types"

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  payment: "Pagamento",
  income: "Recebimento",
  reminder: "Lembrete",
  goal: "Meta",
}

interface CalendarEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  event?: CalendarEvent | null
  /** Data pré-selecionada ao criar (ex.: clique em um dia do calendário). */
  defaultDate?: string
  onSaved: () => void | Promise<void>
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  userId,
  event,
  defaultDate,
  onSaved,
}: CalendarEventDialogProps) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<CalendarEventType>("reminder")
  const [date, setDate] = useState(defaultDate ?? todayISO())
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (event) {
      setTitle(event.title)
      setType(event.event_type)
      setDate(event.event_date)
      setAmount(event.amount === null ? "" : String(event.amount))
      setDescription(event.description ?? "")
    } else {
      setTitle("")
      setType("reminder")
      setDate(defaultDate ?? todayISO())
      setAmount("")
      setDescription("")
    }
  }, [open, event, defaultDate])

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    setError(null)

    if (!title.trim()) return setError("Informe um título")
    if (!date) return setError("Informe uma data")

    const parsedAmount = amount ? Number(amount.replace(",", ".")) : null
    if (parsedAmount !== null && !Number.isFinite(parsedAmount)) {
      return setError("Valor inválido")
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: date,
        event_type: type,
        amount: parsedAmount,
      }

      if (event) {
        await updateCalendarEvent(event.id, payload)
      } else {
        await createCalendarEvent(userId, payload)
      }

      await onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar compromisso")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {event ? "Editar compromisso" : "Novo compromisso"}
            </DialogTitle>
            <DialogDescription>
              Pagamentos, recebimentos e lembretes da sua agenda financeira.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Vencimento do DAS"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as CalendarEventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-date">Data</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-amount">Valor (opcional)</Label>
              <Input
                id="event-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-description">Descrição (opcional)</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes do compromisso"
                rows={3}
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
              {event ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
