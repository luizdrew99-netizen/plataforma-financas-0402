"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FilePlus2, Loader2, Moon, Search, Sun, Truck, User } from "lucide-react"
import { useTheme } from "next-themes"

import { buscaGlobal, type ResultadoBusca } from "@/lib/crm/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const TITULOS: { prefixo: string; titulo: string; exato?: boolean }[] = [
  { prefixo: "/crm", titulo: "Dashboard", exato: true },
  { prefixo: "/crm/simulacoes/nova", titulo: "Nova Simulação" },
  { prefixo: "/crm/simulacoes", titulo: "Simulações" },
  { prefixo: "/crm/clientes", titulo: "Clientes" },
  { prefixo: "/crm/veiculos", titulo: "Veículos" },
  { prefixo: "/crm/contratos", titulo: "Contratos" },
  { prefixo: "/crm/pdfs", titulo: "PDFs Gerados" },
  { prefixo: "/crm/documentos", titulo: "Documentos" },
  { prefixo: "/crm/auditoria", titulo: "Auditoria" },
  { prefixo: "/crm/relatorios", titulo: "Relatórios" },
  { prefixo: "/crm/configuracoes", titulo: "Configurações" },
  { prefixo: "/crm/usuarios", titulo: "Usuários" },
]

function tituloDaRota(caminho: string): string {
  const achado = TITULOS.filter((t) =>
    t.exato ? caminho === t.prefixo : caminho.startsWith(t.prefixo)
  ).sort((a, b) => b.prefixo.length - a.prefixo.length)[0]
  return achado?.titulo ?? "CRM"
}

export function CabecalhoCrm() {
  const caminho = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Busca com atraso curto para não disparar uma chamada por tecla.
  useEffect(() => {
    const consulta = termo.trim()
    if (consulta.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }

    setBuscando(true)
    const temporizador = setTimeout(async () => {
      setResultados(await buscaGlobal(consulta))
      setAberto(true)
      setBuscando(false)
    }, 300)

    return () => clearTimeout(temporizador)
  }, [termo])

  // Fecha o painel ao clicar fora.
  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (!containerRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", aoClicarFora)
    return () => document.removeEventListener("mousedown", aoClicarFora)
  }, [])

  function abrirResultado(item: ResultadoBusca) {
    setAberto(false)
    setTermo("")
    if (item.tipo === "cliente") router.push(`/crm/clientes/${item.id}`)
    else router.push(`/crm/veiculos?busca=${encodeURIComponent(item.titulo.split(" ")[0])}`)
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <h1 className="truncate text-base font-semibold md:text-lg">
        {tituloDaRota(caminho)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div ref={containerRef} className="relative hidden sm:block">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onFocus={() => resultados.length > 0 && setAberto(true)}
            placeholder="Buscar placa, nome, CPF, CNPJ…"
            className="w-56 pl-8 lg:w-72"
          />
          {buscando && (
            <Loader2 className="text-muted-foreground absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin" />
          )}

          {aberto && termo.trim().length >= 2 && (
            <div className="bg-popover absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border shadow-lg">
              {resultados.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  {buscando ? "Buscando…" : "Nada encontrado."}
                </p>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {resultados.map((item) => (
                    <li key={`${item.tipo}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => abrirResultado(item)}
                        className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                      >
                        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                          {item.tipo === "cliente" ? (
                            <User className="size-4" />
                          ) : (
                            <Truck className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.titulo}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {item.subtitulo || (item.tipo === "cliente" ? "Cliente" : "Veículo")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Alternar tema"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <Button asChild size="sm" className="gap-1.5">
          <Link href="/crm/simulacoes/nova">
            <FilePlus2 className="size-4" />
            <span className="hidden md:inline">Nova Simulação</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}
