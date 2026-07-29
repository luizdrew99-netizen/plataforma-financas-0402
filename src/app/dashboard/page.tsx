"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getProfile } from "@/lib/queries"
import type { Profile } from "@/lib/types"
import { FinanceProvider } from "./finance-context"
import { DashboardHeader } from "../components/dashboard-header"
import { FinancialOverview } from "../components/financial-overview"
import { GoalsSection } from "../components/goals-section"
import { CalendarSection } from "../components/calendar-section"
import { QuickActions } from "../components/quick-actions"
import { InsightsPanel } from "../components/insights-panel"
import { PaymentsSection } from "../components/payments-section"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export type DashboardView =
  | "dashboard"
  | "goals"
  | "calendar"
  | "insights"
  | "payments"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/auth?redirectTo=/dashboard")
          return
        }

        const profileData = await getProfile(user.id)

        // O trigger `on_auth_user_created` cria o perfil no cadastro. Se ele
        // não existir, é conta antiga ou migration não aplicada — avisamos em
        // vez de jogar o usuário de volta para o login num loop.
        if (!profileData) {
          setError(
            "Não encontramos o seu perfil. Verifique se a migration do banco foi aplicada."
          )
          return
        }

        setProfile(profileData)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar seu perfil"
        )
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Carregando seu painel...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
          <p className="text-slate-700 dark:text-slate-300">
            {error ?? "Perfil não encontrado"}
          </p>
          <Button variant="outline" onClick={() => router.refresh()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <FinanceProvider profile={profile}>
      <DashboardShell />
    </FinanceProvider>
  )
}

function DashboardShell() {
  const [activeView, setActiveView] = useState<DashboardView>("dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <DashboardHeader activeView={activeView} setActiveView={setActiveView} />

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {activeView === "dashboard" && (
            <div className="space-y-6">
              <FinancialOverview />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <GoalsSection />
                </div>
                <div>
                  <QuickActions />
                </div>
              </div>
            </div>
          )}

          {activeView === "goals" && (
            <div className="space-y-6">
              <GoalsSection expanded />
            </div>
          )}

          {activeView === "calendar" && (
            <div className="space-y-6">
              <CalendarSection />
            </div>
          )}

          {activeView === "insights" && (
            <div className="space-y-6">
              <InsightsPanel />
            </div>
          )}

          {activeView === "payments" && (
            <div className="space-y-6">
              <PaymentsSection />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
