"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Shield, Zap, Target, Calendar, PieChart, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/25">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
                ProFin
              </h1>
            </div>
            <Link href="/auth">
              <Button variant="outline" className="border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                Entrar
              </Button>
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Gestão Financeira Profissional
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
              Controle suas finanças de forma{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
                inteligente
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Plataforma completa para CLT e MEI gerenciarem receitas, despesas, metas e muito mais.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/auth">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 shadow-lg shadow-emerald-500/25 text-lg px-8">
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-200 dark:border-slate-800 text-lg px-8">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Metas Financeiras</CardTitle>
                <CardDescription>
                  Defina e acompanhe suas metas de economia e investimento
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Calendário Financeiro</CardTitle>
                <CardDescription>
                  Organize pagamentos, recebimentos e compromissos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Análises Inteligentes</CardTitle>
                <CardDescription>
                  Insights automáticos sobre seus gastos e receitas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Segurança Total</CardTitle>
                <CardDescription>
                  Seus dados protegidos com criptografia de ponta
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Perfis Personalizados</CardTitle>
                <CardDescription>
                  Funcionalidades específicas para CLT e MEI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle>Rápido e Fácil</CardTitle>
                <CardDescription>
                  Interface intuitiva e responsiva para qualquer dispositivo
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-4xl mx-auto border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
            <CardContent className="relative z-10 p-12 text-center space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold">
                Pronto para transformar suas finanças?
              </h3>
              <p className="text-lg text-emerald-50 max-w-2xl mx-auto">
                Junte-se a milhares de profissionais que já estão no controle total do seu dinheiro
              </p>
              <Link href="/auth">
                <Button size="lg" variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50 text-lg px-8 shadow-xl">
                  Criar Conta Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                © 2024 ProFin. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Suporte
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
