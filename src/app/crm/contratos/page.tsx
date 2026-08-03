"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CalendarClock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  atualizarContrato,
  listarContratos,
  type ContratoComRelacoes,
} from "@/lib/crm/queries"
import { formatarData, formatarMoeda, formatarPlaca } from "@/lib/crm/format"
import { SITUACAO_CONTRATO, type SituacaoContrato } from "@/lib/crm/types"
import {
  ESTADO_VENCIMENTO,
  calcularVencimento,
  descreverVencimento,
  type EstadoVencimento,
} from "@/lib/crm/vencimentos"

type FiltroVencimento = "todos" | EstadoVencimento

export default function PaginaContratos() {
  const [contratos, setContratos] = useState<ContratoComRelacoes[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroVencimento>("todos")

  const carregar = useCallback(async () => {
    try {
      setContratos(await listarContratos())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const comVencimento = useMemo(
    () => contratos.map((c) => ({ contrato: c, vencimento: calcularVencimento(c) })),
    [contratos]
  )

  const contadores = useMemo(() => {
    const conta = (estado: EstadoVencimento) =>
      comVencimento.filter((x) => x.vencimento.estado === estado).length
    return {
      vencido: conta("vencido"),
      vence_em_breve: conta("vence_em_breve"),
      sem_data: conta("sem_data"),
      total: comVencimento.length,
    }
  }, [comVencimento])

  const visiveis = useMemo(
    () =>
      filtro === "todos"
        ? comVencimento
        : comVencimento.filter((x) => x.vencimento.estado === filtro),
    [comVencimento, filtro]
  )

  /** Atualiza a tela na hora e desfaz se o banco recusar. */
  async function alterar(id: string, patch: Partial<ContratoComRelacoes>) {
    const anterior = contratos
    setContratos((atual) => atual.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    try {
      await atualizarContrato(id, patch)
    } catch (e) {
      setContratos(anterior)
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.")
    }
  }

  if (carregando) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const atalhos: { valor: FiltroVencimento; rotulo: string; quantidade: number }[] = [
    { valor: "todos", rotulo: "Todos", quantidade: contadores.total },
    { valor: "vencido", rotulo: "Vencidos", quantidade: contadores.vencido },
    {
      valor: "vence_em_breve",
      rotulo: "Vencem em 7 dias",
      quantidade: contadores.vence_em_breve,
    },
    { valor: "sem_data", rotulo: "Sem vencimento", quantidade: contadores.sem_data },
  ]

  return (
    <div className="space-y-4">
      {(contadores.vencido > 0 || contadores.vence_em_breve > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {contadores.vencido > 0 && (
            <button
              type="button"
              onClick={() => setFiltro("vencido")}
              className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-left transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:hover:bg-red-950/60"
            >
              <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">
                  {contadores.vencido}{" "}
                  {contadores.vencido === 1
                    ? "contrato vencido"
                    : "contratos vencidos"}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Clique para ver só eles
                </p>
              </div>
            </button>
          )}
          {contadores.vence_em_breve > 0 && (
            <button
              type="button"
              onClick={() => setFiltro("vence_em_breve")}
              className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
            >
              <CalendarClock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  {contadores.vence_em_breve} vencendo em até 7 dias
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Clique para ver só eles
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {atalhos.map((a) => (
          <Button
            key={a.valor}
            size="sm"
            variant={filtro === a.valor ? "default" : "outline"}
            onClick={() => setFiltro(a.valor)}
            className="gap-1.5"
          >
            {a.rotulo}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                filtro === a.valor ? "bg-white/20" : "bg-muted"
              )}
            >
              {a.quantidade}
            </span>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="px-0">
          {visiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <ShieldCheck className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">
                  {contadores.total === 0
                    ? "Nenhum contrato"
                    : "Nenhum contrato neste filtro"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {contadores.total === 0
                    ? "Confirme uma simulação para gerar o primeiro contrato."
                    : "Escolha outro filtro acima."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-right">Mensal</TableHead>
                    <TableHead className="w-24">Dia venc.</TableHead>
                    <TableHead className="w-40">Data específica</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-44">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map(({ contrato: c, vencimento }) => {
                    const info = ESTADO_VENCIMENTO[vencimento.estado]
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                        <TableCell className="max-w-[180px] truncate font-medium">
                          {c.cliente ? (
                            <Link
                              href={`/crm/clientes/${c.cliente.id}`}
                              className="hover:underline"
                            >
                              {c.cliente.nome}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {c.veiculo ? formatarPlaca(c.veiculo.placa) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatarMoeda(c.valor_mensal)}
                        </TableCell>

                        <TableCell>
                          <Input
                            inputMode="numeric"
                            className="h-8 w-16 text-center"
                            placeholder="—"
                            aria-label={`Dia de vencimento do contrato ${c.numero}`}
                            defaultValue={c.dia_vencimento ?? ""}
                            onBlur={(e) => {
                              const bruto = e.target.value.replace(/\D/g, "")
                              const dia = bruto ? Number(bruto) : null
                              if (dia !== null && (dia < 1 || dia > 31)) {
                                toast.error("O dia precisa estar entre 1 e 31.")
                                e.target.value = String(c.dia_vencimento ?? "")
                                return
                              }
                              if (dia !== (c.dia_vencimento ?? null)) {
                                void alterar(c.id, { dia_vencimento: dia })
                              }
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            type="date"
                            className="h-8"
                            aria-label={`Data de vencimento do contrato ${c.numero}`}
                            defaultValue={c.data_vencimento ?? ""}
                            onChange={(e) =>
                              void alterar(c.id, {
                                data_vencimento: e.target.value || null,
                              })
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                              info.classe
                            )}
                          >
                            {vencimento.data
                              ? `${formatarData(vencimento.data)} · ${descreverVencimento(vencimento)}`
                              : info.rotulo}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Select
                            value={c.situacao}
                            onValueChange={(v) =>
                              void alterar(c.id, { situacao: v as SituacaoContrato })
                            }
                          >
                            <SelectTrigger className="w-full" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(SITUACAO_CONTRATO) as SituacaoContrato[]
                              ).map((s) => (
                                <SelectItem key={s} value={s}>
                                  {SITUACAO_CONTRATO[s].rotulo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
