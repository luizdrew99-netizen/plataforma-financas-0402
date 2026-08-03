"use client"

/**
 * Histórico de alterações. Os dados são gravados pelo trigger
 * `registrar_auditoria` do banco; aqui é só a leitura, que a RLS libera
 * apenas para administrador.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, History, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCrm } from "@/components/crm/provedor-crm"
import { listarAuditoria, type LinhaAuditoria } from "@/lib/crm/queries"
import { formatarDataHora, iniciais } from "@/lib/crm/format"

const TABELAS = [
  { valor: "todas", rotulo: "Todas as tabelas" },
  { valor: "clientes", rotulo: "Clientes" },
  { valor: "veiculos", rotulo: "Veículos" },
  { valor: "simulacoes", rotulo: "Simulações" },
  { valor: "contratos", rotulo: "Contratos" },
  { valor: "configuracoes", rotulo: "Configurações" },
  { valor: "categorias", rotulo: "Categorias" },
  { valor: "coberturas", rotulo: "Coberturas" },
  { valor: "beneficios", rotulo: "Benefícios" },
]

const ACOES: Record<string, { rotulo: string; classe: string }> = {
  INSERT: {
    rotulo: "Criou",
    classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  UPDATE: {
    rotulo: "Alterou",
    classe: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  DELETE: {
    rotulo: "Excluiu",
    classe: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
}

/** Campos que mudam sozinhos e só poluiriam o diff. */
const IGNORADOS = new Set(["updated_at", "created_at"])

function valorLegivel(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

/** Só os campos que realmente mudaram entre antes e depois. */
function camposAlterados(linha: LinhaAuditoria) {
  const antes = linha.dados_antes ?? {}
  const depois = linha.dados_depois ?? {}
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)])

  return [...chaves]
    .filter((c) => !IGNORADOS.has(c))
    .map((campo) => ({
      campo,
      de: valorLegivel(antes[campo]),
      para: valorLegivel(depois[campo]),
    }))
    .filter((c) => c.de !== c.para)
}

export default function PaginaAuditoria() {
  const { ehAdmin } = useCrm()
  const [linhas, setLinhas] = useState<LinhaAuditoria[]>([])
  const [tabela, setTabela] = useState("todas")
  const [acao, setAcao] = useState("todas")
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setLinhas(await listarAuditoria({ tabela, acao, limite: 300 }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [tabela, acao])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const rotuloTabela = useMemo(
    () => Object.fromEntries(TABELAS.map((t) => [t.valor, t.rotulo])),
    []
  )

  if (!ehAdmin) {
    return (
      <Alert>
        <ShieldAlert className="size-4" />
        <AlertDescription>
          O histórico de alterações é restrito a administradores.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-tabela">Tabela</Label>
          <Select value={tabela} onValueChange={setTabela}>
            <SelectTrigger id="filtro-tabela" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABELAS.map((t) => (
                <SelectItem key={t.valor} value={t.valor}>
                  {t.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-acao">Ação</Label>
          <Select value={acao} onValueChange={setAcao}>
            <SelectTrigger id="filtro-acao" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {Object.entries(ACOES).map(([valor, info]) => (
                <SelectItem key={valor} value={valor}>
                  {info.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          {carregando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : linhas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <History className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nada registrado neste filtro</p>
                <p className="text-muted-foreground text-sm">
                  Toda criação, alteração e exclusão aparece aqui.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {linhas.map((linha) => {
                const info = ACOES[linha.acao] ?? {
                  rotulo: linha.acao,
                  classe: "bg-muted text-muted-foreground",
                }
                const mudancas = camposAlterados(linha)

                return (
                  <li key={linha.id}>
                    <Collapsible>
                      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 px-6 py-3 text-left transition-colors">
                        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium">
                          {iniciais(linha.usuario?.nome ?? linha.usuario?.email)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                info.classe
                              )}
                            >
                              {info.rotulo}
                            </span>
                            <span className="text-sm font-medium">
                              {rotuloTabela[linha.tabela] ?? linha.tabela}
                            </span>
                            {mudancas.length > 0 && linha.acao === "UPDATE" && (
                              <span className="text-muted-foreground text-xs">
                                {mudancas.length}{" "}
                                {mudancas.length === 1 ? "campo" : "campos"}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {linha.usuario?.nome ?? "Usuário removido"} ·{" "}
                            {formatarDataHora(linha.created_at)}
                          </span>
                        </span>

                        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="bg-muted/40 space-y-2 px-6 py-3">
                          {mudancas.length === 0 ? (
                            <p className="text-muted-foreground text-xs">
                              Sem campos comparáveis neste registro.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground text-left">
                                    <th className="pb-1 pr-4 font-medium">Campo</th>
                                    <th className="pb-1 pr-4 font-medium">De</th>
                                    <th className="pb-1 font-medium">Para</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mudancas.map((m) => (
                                    <tr key={m.campo} className="align-top">
                                      <td className="py-1 pr-4 font-mono">{m.campo}</td>
                                      <td className="text-muted-foreground max-w-[280px] break-words py-1 pr-4 line-through">
                                        {m.de}
                                      </td>
                                      <td className="max-w-[280px] break-words py-1 font-medium">
                                        {m.para}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {!!linha.registro_id && (
                            <p className="text-muted-foreground font-mono text-[10px]">
                              registro {linha.registro_id}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
