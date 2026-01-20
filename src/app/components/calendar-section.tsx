"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Plus, Clock, DollarSign, CreditCard, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"

interface CalendarEvent {
  id: string
  title: string
  type: "payment" | "income" | "reminder" | "goal"
  date: string
  amount?: number
  description?: string
  status: "pending" | "completed" | "overdue"
}

export function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "1",
      title: "Pagamento Aluguel",
      type: "payment",
      date: "2024-01-10",
      amount: 1500,
      status: "pending"
    },
    {
      id: "2",
      title: "Salário CLT",
      type: "income",
      date: "2024-01-05",
      amount: 5000,
      status: "completed"
    },
    {
      id: "3",
      title: "Fatura Cartão de Crédito",
      type: "payment",
      date: "2024-01-15",
      amount: 2340,
      status: "pending"
    },
    {
      id: "4",
      title: "Transferir para Poupança",
      type: "reminder",
      date: "2024-01-20",
      amount: 1000,
      status: "pending"
    }
  ])

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(event => event.date === dateStr)
  }

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const getEventIcon = (type: string) => {
    switch (type) {
      case "payment":
        return CreditCard
      case "income":
        return DollarSign
      case "reminder":
        return Bell
      default:
        return Clock
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "payment":
        return "from-orange-500 to-orange-600"
      case "income":
        return "from-emerald-500 to-emerald-600"
      case "reminder":
        return "from-blue-500 to-blue-600"
      default:
        return "from-purple-500 to-purple-600"
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário Financeiro
              </CardTitle>
              <CardDescription className="mt-1">
                Planeje suas atividades financeiras
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                  <DialogDescription>
                    Adicione um compromisso financeiro ao seu calendário
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="event-title">Título</Label>
                    <Input id="event-title" placeholder="Ex: Pagamento de conta" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-type">Tipo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Pagamento</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="reminder">Lembrete</SelectItem>
                        <SelectItem value="goal">Meta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-date">Data</Label>
                    <Input id="event-date" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-amount">Valor (opcional)</Label>
                    <Input id="event-amount" type="number" placeholder="0,00" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-description">Descrição</Label>
                    <Textarea id="event-description" placeholder="Detalhes adicionais..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsDialogOpen(false)}>Criar Evento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="p-2" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dayEvents = getEventsForDay(day)
                const isToday = 
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear()

                return (
                  <div
                    key={day}
                    className={`
                      min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all duration-200
                      hover:shadow-md hover:border-primary
                      ${isToday ? "bg-blue-50 dark:bg-blue-950 border-blue-500" : "bg-slate-50 dark:bg-slate-800"}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : ""}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded bg-gradient-to-r ${getEventColor(event.type)} text-white truncate`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          <CardDescription>Compromissos financeiros agendados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.map((event) => {
            const Icon = getEventIcon(event.type)
            const eventDate = new Date(event.date)
            const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

            return (
              <div
                key={event.id}
                className="p-3 rounded-lg border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getEventColor(event.type)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {daysUntil === 0 ? "Hoje" : daysUntil === 1 ? "Amanhã" : `${daysUntil} dias`}
                      </Badge>
                      {event.amount && (
                        <span className="text-xs font-medium">
                          R$ {event.amount.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
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
