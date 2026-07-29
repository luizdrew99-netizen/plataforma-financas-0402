"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, LayoutDashboard, Target, Calendar, TrendingUp, Menu, User, Moon, Sun, Briefcase, Building2, Receipt, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import { parseISODate } from "@/lib/format"
import { useFinance } from "../dashboard/finance-context"
import type { DashboardView } from "../dashboard/page"

interface DashboardHeaderProps {
  activeView: DashboardView
  setActiveView: (view: DashboardView) => void
}

const NAV_ITEMS: { view: DashboardView; label: string; icon: typeof Target }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "goals", label: "Metas", icon: Target },
  { view: "payments", label: "Pagamentos", icon: Receipt },
  { view: "calendar", label: "Agenda", icon: Calendar },
  { view: "insights", label: "Insights", icon: TrendingUp },
]

export function DashboardHeader({ activeView, setActiveView }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { profile, userType, setUserType, transactions } = useFinance()
  const [signingOut, setSigningOut] = useState(false)

  // Contador real: contas pendentes vencidas ou a vencer nos próximos 7 dias.
  const alerts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 7)

    return transactions.filter((t) => {
      if (t.type !== "expense" || t.status !== "pending" || !t.due_date) return false
      return parseISODate(t.due_date) <= limit
    }).length
  }, [transactions])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace("/auth")
    router.refresh()
  }

  const initials = (profile.full_name ?? profile.email)
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-200/50 dark:border-emerald-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <TrendingUp className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  ProFin
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                  GESTÃO PROFISSIONAL
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 ml-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <Button
                variant={userType === "clt" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserType("clt")}
                className={`gap-2 ${userType === "clt" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Briefcase className="h-4 w-4" />
                CLT
              </Button>
              <Button
                variant={userType === "mei" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserType("mei")}
                className={`gap-2 ${userType === "mei" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Building2 className="h-4 w-4" />
                MEI
              </Button>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
                <Button
                  key={view}
                  variant={activeView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(view)}
                  className={`gap-2 ${activeView === view ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
              className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveView("payments")}
              aria-label={`${alerts} contas a vencer`}
              className="relative hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <Bell className="h-5 w-5" />
              {alerts > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-emerald-600">
                  {alerts > 9 ? "9+" : alerts}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Minha conta" className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                  {initials ? (
                    <span className="text-sm font-semibold">{initials}</span>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium truncate">
                    {profile.full_name ?? "Minha Conta"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Tipo de Perfil</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setUserType("clt")}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  CLT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUserType("mei")}>
                  <Building2 className="h-4 w-4 mr-2" />
                  MEI
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Navegação</DropdownMenuLabel>
                {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
                  <DropdownMenuItem key={view} onClick={() => setActiveView(view)}>
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
