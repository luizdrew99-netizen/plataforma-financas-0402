"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  FileText,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EtiquetaCategoria, EtiquetaStatus } from "@/components/crm/etiquetas"
import {
  listarContratos,
  listarSimulacoes,
  obterResumoDashboard,
} from "@/lib/crm/queries"
import { calcularVencimento } from "@/lib/crm/vencimentos"
import {
  formatarData,
  formatarMesCurto,
  formatarMoeda,
  formatarNumeroSimulacao,
  formatarPlaca,
} from "@/lib/crm/format"
import type { DashboardResumo, SimulacaoDetalhe } from "@/lib/crm/types"

/**
 * Duas séries de contagem no mesmo eixo — nunca um segundo eixo para valor.
 * Cores: slots categóricos 1 e 2, com passo próprio para o tema escuro.
 */
const CONFIG_GRAFICO = {
  simulacoes: {
    label: "Simulações",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
  confirmadas: {
    label: "Confirmadas",
    theme: { light: "#eb6834", dark: "#d95926" },
  },
} satisfies ChartConfig

interface IndicadorProps {
  titulo: string
  valor: string
  detalhe?: string
  icone: React.ComponentType<{ className?: string }>
  carregando?: boolean
}

function Indicador({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  carregando,
}: IndicadorProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {titulo}
        </CardTitle>
        <Icone className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        {carregando ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{valor}</p>
        )}
        {detalhe && !carregando && (
          <p className="text-muted-foreground mt-1 text-xs">{detalhe}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function PaginaDashboard() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null)
  const [ultimas, setUltimas] = useState<SimulacaoDetalhe[]>([])
  const [vencimentos, setVencimentos] = useState({ vencidos: 0, proximos: 0 })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [dados, simulacoes, contratos] = await Promise.all([
          obterResumoDashboard(),
          listarSimulacoes({ limite: 8 }),
          listarContratos(),
        ])
        if (!ativo) return
        setResumo(dados)
        setUltimas(simulacoes)

        // O vencimento não é coluna do banco: sai de data_vencimento ou do
        // dia do mês, então é calculado aqui a partir dos contratos.
        const estados = contratos.map((c) => calcularVencimento(c).estado)
        setVencimentos({
          vencidos: estados.filter((e) => e === "vencido").length,
          proximos: estados.filter((e) => e === "vence_em_breve").length,
        })
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar.")
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const dadosGrafico = useMemo(
    () =>
      (resumo?.serie_mensal ?? []).map((ponto) => ({
        ...ponto,
        rotulo: formatarMesCurto(ponto.mes),
      })),
    [resumo]
  )

  const taxaConversao = useMemo(() => {
    if (!resumo || resumo.total_simulacoes === 0) return "—"
    const taxa = (resumo.confirmadas / resumo.total_simulacoes) * 100
    return `${taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
  }, [resumo])

  if (erro) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive text-base">
            Não foi possível carregar o dashboard
          </CardTitle>
          <CardDescription>{erro}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {(vencimentos.vencidos > 0 || vencimentos.proximos > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vencimentos.vencidos > 0 && (
            <Link
              href="/crm/contratos"
              className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-3 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:hover:bg-red-950/60"
            >
              <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">
                  {vencimentos.vencidos}{" "}
                  {vencimentos.vencidos === 1
                    ? "contrato vencido"
                    : "contratos vencidos"}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Ver em Contratos
                </p>
              </div>
            </Link>
          )}
          {vencimentos.proximos > 0 && (
            <Link
              href="/crm/contratos"
              className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
            >
              <CalendarClock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  {vencimentos.proximos} vencendo em até 7 dias
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Ver em Contratos
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Simulações"
          valor={String(resumo?.total_simulacoes ?? 0)}
          detalhe={`${resumo?.simulacoes_mes ?? 0} neste mês`}
          icone={FileText}
          carregando={carregando}
        />
        <Indicador
          titulo="Simulações hoje"
          valor={String(resumo?.simulacoes_hoje ?? 0)}
          detalhe="Criadas desde a meia-noite"
          icone={FilePlus2}
          carregando={carregando}
        />
        <Indicador
          titulo="Confirmadas"
          valor={String(resumo?.confirmadas ?? 0)}
          detalhe={`Conversão de ${taxaConversao}`}
          icone={CheckCircle2}
          carregando={carregando}
        />
        <Indicador
          titulo="Valor médio mensal"
          valor={formatarMoeda(resumo?.valor_medio ?? 0)}
          detalhe="Média de todas as simulações"
          icone={TrendingUp}
          carregando={carregando}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Simulações por mês</CardTitle>
            <CardDescription>
              Últimos 12 meses — quantas foram criadas e quantas viraram cadastro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartContainer
                config={CONFIG_GRAFICO}
                className="aspect-auto h-[260px] w-full"
              >
                <BarChart data={dadosGrafico} barGap={2} margin={{ left: -16, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rotulo"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="simulacoes"
                    fill="var(--color-simulacoes)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="confirmadas"
                    fill="var(--color-confirmadas)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carteira</CardTitle>
            <CardDescription>Base cadastrada hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Users className="size-5" />
              </span>
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {resumo?.total_clientes ?? 0}
                </p>
                <p className="text-muted-foreground text-xs">Clientes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Truck className="size-5" />
              </span>
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {resumo?.total_veiculos ?? 0}
                </p>
                <p className="text-muted-foreground text-xs">Veículos</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Mensalidade confirmada no mês
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {formatarMoeda(resumo?.ticket_confirmado_mes ?? 0)}
              </p>
            </div>

            <Button asChild className="w-full gap-1.5">
              <Link href="/crm/simulacoes/nova">
                <FilePlus2 className="size-4" />
                Nova simulação
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Últimas simulações</CardTitle>
            <CardDescription>As 8 propostas mais recentes</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/crm/simulacoes">
              Ver todas
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {carregando ? (
            <div className="space-y-2 px-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : ultimas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <FileText className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nenhuma simulação ainda</p>
                <p className="text-muted-foreground text-sm">
                  Crie a primeira proposta para começar a acompanhar os números aqui.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/crm/simulacoes/nova">Criar simulação</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="hidden md:table-cell">Veículo</TableHead>
                    <TableHead>Cat.</TableHead>
                    <TableHead className="text-right">Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimas.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => {
                        window.location.href = `/crm/simulacoes/${s.id}`
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {formatarNumeroSimulacao(s.numero)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">
                        {s.cliente_nome}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatarPlaca(s.veiculo_placa)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-[200px] truncate md:table-cell">
                        {[s.veiculo_marca, s.veiculo_modelo]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </TableCell>
                      <TableCell>
                        <EtiquetaCategoria codigo={s.categoria_codigo} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatarMoeda(s.total_mensal)}
                      </TableCell>
                      <TableCell>
                        <EtiquetaStatus status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                        {formatarData(s.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
