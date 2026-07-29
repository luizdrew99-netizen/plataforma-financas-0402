"use client"

import { useMemo, useState } from "react"
import { Calendar as CalendarIcon, Plus, DollarSign, CreditCard, Bell, Target, ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { deleteCalendarEvent } from "@/lib/queries"
import { formatCurrency, formatDate, formatMonthYear, parseISODate } from "@/lib/format"
import { useFinance } from "../dashboard/finance-context"
import { CalendarEventDialog, EVENT_TYPE_LABELS } from "./calendar-event-dialog"
import type { CalendarEvent, CalendarEventType } from "@/lib/types"

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const TYPE_META: Record<
  CalendarEventType,
  { icon: typeof Bell; dot: string; badge: string }
> = {
  payment: {
    icon: CreditCard,
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
  income: {
    icon: DollarSign,
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
  reminder: {
    icon: Bell,
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  goal: {
    icon: Target,
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  },
}

function toISO(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function CalendarSection() {
  const { profile, events, loading, refresh } = useFinance()

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = map.get(event.event_date) ?? []
      list.push(event)
      map.set(event.event_date, list)
    }
    return map
  }, [events])

  // Grade do mês incluindo os dias "vazios" antes do dia 1, para alinhar as
  // colunas com os dias da semana.
  const grid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day))
    }
    return cells
  }, [currentDate])

  const monthEvents = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    return events
      .filter((event) => {
        const date = parseISODate(event.event_date)
        return date.getFullYear() === year && date.getMonth() === month
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
  }, [events, currentDate])

  const listedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : monthEvents

  const todayISOValue = toISO(new Date())

  const changeMonth = (delta: number) => {
    setSelectedDate(null)
    setCurrentDate(
      (date) => new Date(date.getFullYear(), date.getMonth() + delta, 1)
    )
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCalendarEvent(toDelete.id)
      await refresh()
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <span className="capitalize">{formatMonthYear(currentDate)}</span>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changeMonth(-1)}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentDate(new Date())
                    setSelectedDate(null)
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changeMonth(1)}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />

                const iso = toISO(date)
                const dayEvents = eventsByDate.get(iso) ?? []
                const isToday = iso === todayISOValue
                const isSelected = iso === selectedDate

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : iso)}
                    className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-start gap-1 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                        : isToday
                          ? "border-emerald-400"
                          : "border-transparent"
                    }`}
                  >
                    <span className={isToday ? "font-bold text-emerald-600" : ""}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="flex gap-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className={`h-1.5 w-1.5 rounded-full ${TYPE_META[event.event_type].dot}`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedDate ? "Compromissos do dia" : "Compromissos do mês"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedDate
                    ? formatDate(selectedDate)
                    : `${monthEvents.length} agendado${monthEvents.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <Button
                size="icon"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
                aria-label="Novo compromisso"
                className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <>
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </>
            )}

            {!loading && listedEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {selectedDate
                  ? "Nenhum compromisso nesse dia."
                  : "Nenhum compromisso neste mês."}
              </p>
            )}

            {!loading &&
              listedEvents.map((event) => {
                const meta = TYPE_META[event.event_type]
                const Icon = meta.icon

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.badge}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-xs border-0 ${meta.badge}`}>
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.event_date)}
                        </span>
                      </div>
                      {event.amount !== null && (
                        <p className="text-sm font-semibold mt-1">
                          {formatCurrency(Number(event.amount))}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Ações do compromisso">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(event)
                            setDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setToDelete(event)}
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
      </div>

      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={profile.id}
        event={editing}
        defaultDate={selectedDate ?? undefined}
        onSaved={refresh}
      />

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
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
