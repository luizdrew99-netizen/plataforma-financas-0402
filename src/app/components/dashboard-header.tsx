"use client"

import { Bell, LayoutDashboard, Target, Calendar, TrendingUp, Menu, User, Moon, Sun, Briefcase, Building2, Receipt } from "lucide-react"
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
import { UserType } from "../page"

interface DashboardHeaderProps {
  activeView: "dashboard" | "goals" | "calendar" | "insights" | "payments"
  setActiveView: (view: "dashboard" | "goals" | "calendar" | "insights" | "payments") => void
  userType: UserType
  setUserType: (type: UserType) => void
}

export function DashboardHeader({ activeView, setActiveView, userType, setUserType }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()

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
              <Button
                variant={activeView === "dashboard" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("dashboard")}
                className={`gap-2 ${activeView === "dashboard" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={activeView === "goals" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("goals")}
                className={`gap-2 ${activeView === "goals" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Target className="h-4 w-4" />
                Metas
              </Button>
              <Button
                variant={activeView === "payments" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("payments")}
                className={`gap-2 ${activeView === "payments" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Receipt className="h-4 w-4" />
                Pagamentos
              </Button>
              <Button
                variant={activeView === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("calendar")}
                className={`gap-2 ${activeView === "calendar" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Calendar className="h-4 w-4" />
                Agenda
              </Button>
              <Button
                variant={activeView === "insights" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("insights")}
                className={`gap-2 ${activeView === "insights" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <TrendingUp className="h-4 w-4" />
                Insights
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button variant="ghost" size="icon" className="relative hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-emerald-600">
                3
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configurações</DropdownMenuItem>
                <DropdownMenuItem>Integrações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
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
                <DropdownMenuItem onClick={() => setActiveView("dashboard")}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView("goals")}>
                  <Target className="h-4 w-4 mr-2" />
                  Metas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView("payments")}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pagamentos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView("calendar")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agenda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView("insights")}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Insights
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
