"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile } from "@/lib/supabase"
import { DashboardHeader } from "../components/dashboard-header"
import { FinancialOverview } from "../components/financial-overview"
import { GoalsSection } from "../components/goals-section"
import { CalendarSection } from "../components/calendar-section"
import { QuickActions } from "../components/quick-actions"
import { InsightsPanel } from "../components/insights-panel"
import { PaymentsSection } from "../components/payments-section"
import { Loader2 } from "lucide-react"

export type UserType = "clt" | "mei"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeView, setActiveView] = useState<"dashboard" | "goals" | "calendar" | "insights" | "payments">("dashboard")
  const [userType, setUserType] = useState<UserType>("clt")

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push("/auth")
          return
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (error) throw error

        setProfile(profileData)
        setUserType(profileData.user_type as UserType)
      } catch (error) {
        console.error("Erro ao carregar perfil:", error)
        router.push("/auth")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleUserTypeChange = async (newType: UserType) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ user_type: newType })
        .eq("id", profile.id)

      if (error) throw error

      setUserType(newType)
      setProfile({ ...profile, user_type: newType })
    } catch (error) {
      console.error("Erro ao atualizar tipo de usuário:", error)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <DashboardHeader 
          activeView={activeView} 
          setActiveView={setActiveView}
          userType={userType}
          setUserType={handleUserTypeChange}
          profile={profile}
        />
        
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {activeView === "dashboard" && (
            <div className="space-y-6">
              <FinancialOverview userType={userType} userId={profile?.id} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <GoalsSection userType={userType} userId={profile?.id} />
                </div>
                <div>
                  <QuickActions userType={userType} userId={profile?.id} />
                </div>
              </div>
            </div>
          )}

          {activeView === "goals" && (
            <div className="space-y-6">
              <GoalsSection expanded userType={userType} userId={profile?.id} />
            </div>
          )}

          {activeView === "calendar" && (
            <div className="space-y-6">
              <CalendarSection userId={profile?.id} />
            </div>
          )}

          {activeView === "insights" && (
            <div className="space-y-6">
              <InsightsPanel userType={userType} userId={profile?.id} />
            </div>
          )}

          {activeView === "payments" && (
            <div className="space-y-6">
              <PaymentsSection userType={userType} userId={profile?.id} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
