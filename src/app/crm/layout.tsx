"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { configuracaoSupabaseAusente, supabase } from "@/lib/supabase"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { BarraLateralCrm } from "@/components/crm/barra-lateral"
import { CabecalhoCrm } from "@/components/crm/cabecalho"
import { ProvedorCrm, useCrm } from "@/components/crm/provedor-crm"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

function TelaCarregando({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <p className="text-muted-foreground text-sm">{mensagem}</p>
      </div>
    </div>
  )
}

/** Segura a renderização até confirmar a sessão do Supabase. */
function GuardaSessao({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [estado, setEstado] = useState<"verificando" | "liberado">("verificando")

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      if (!data.session) {
        router.replace("/auth")
        return
      }
      setEstado("liberado")
    })

    // Se a sessão cair com o CRM aberto, volta para o login em vez de
    // deixar a tela quebrando em erro de RLS a cada consulta.
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo) return
      if (evento === "SIGNED_OUT" || !sessao) router.replace("/auth")
    })

    return () => {
      ativo = false
      assinatura.subscription.unsubscribe()
    }
  }, [router])

  if (estado === "verificando") {
    return <TelaCarregando mensagem="Verificando seu acesso…" />
  }
  return <>{children}</>
}

/** Espera os cadastros base carregarem e trata a falha de forma visível. */
function ConteudoCrm({ children }: { children: React.ReactNode }) {
  const { carregando, erro, recarregar } = useCrm()

  if (carregando) return <TelaCarregando mensagem="Carregando o CRM…" />

  if (erro) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Não foi possível abrir o CRM</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{erro}</p>
            <p className="text-xs">
              Se esta é a primeira vez, confirme que a migração
              <code className="mx-1 rounded bg-black/10 px-1 py-0.5 text-[11px]">
                20260731000100_crm_protecao_veicular.sql
              </code>
              foi aplicada no projeto Supabase.
            </p>
            <Button size="sm" variant="outline" onClick={() => void recarregar()}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <BarraLateralCrm />
      <SidebarInset className="min-w-0">
        <CabecalhoCrm />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** Sem as chaves do Supabase nada funciona — melhor dizer isso do que
 *  deixar o usuário encarando um erro de login que não explica nada. */
function AvisoConfiguracaoAusente() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Alert className="max-w-lg">
        <AlertTitle>Falta configurar o acesso ao banco</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            As variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> não foram definidas neste
            ambiente.
          </p>
          <p className="text-xs">
            Na Vercel, configure as duas em Settings → Environment Variables,
            marcando também o ambiente de <strong>Preview</strong>, e refaça o
            deploy.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default function LayoutCrm({ children }: { children: React.ReactNode }) {
  if (configuracaoSupabaseAusente) return <AvisoConfiguracaoAusente />

  return (
    <GuardaSessao>
      <ProvedorCrm>
        <ConteudoCrm>{children}</ConteudoCrm>
        <Toaster richColors position="top-right" />
      </ProvedorCrm>
    </GuardaSessao>
  )
}
