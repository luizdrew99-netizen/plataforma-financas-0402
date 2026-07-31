"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EtiquetaStatus } from "@/components/crm/etiquetas"
import { listarSimulacoes } from "@/lib/crm/queries"
import {
  formatarData,
  formatarMoeda,
  formatarNumeroSimulacao,
  formatarPlaca,
} from "@/lib/crm/format"
import { STATUS_SIMULACAO, type SimulacaoDetalhe, type StatusSimulacao } from "@/lib/crm/types"

function inicioDoMes(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

/** CSV com BOM e ponto e vírgula — é o que o Excel em pt-BR abre direito. */
function baixarCsv(nome: string, linhas: string[][]) {
  const conteudo = linhas
    .map((linha) =>
      linha
        .map((celula) => `"${String(celula ?? "").replace(/"/g, '""')}"`)
        .join(";")
    )
    .join("\r\n")

  const blob = new Blob([`﻿${conteudo}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PaginaRelatorios() {
  const [de, setDe] = useState(inicioDoMes)
  const [ate, setAte] = useState(hoje)
  const [status, setStatus] = useState<StatusSimulacao | "todas">("todas")
  const [todas, setTodas] = useState<SimulacaoDetalhe[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setTodas(await listarSimulacoes({ limite: 1000 }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const filtradas = useMemo(() => {
    // `ate` é inclusivo: soma um dia para pegar tudo que foi criado na data final.
    const inicio = new Date(`${de}T00:00:00`)
    const fim = new Date(`${ate}T00:00:00`)
    fim.setDate(fim.getDate() + 1)

    return todas.filter((s) => {
      const criada = new Date(s.created_at)
      if (criada < inicio || criada >= fim) return false
      if (status !== "todas" && s.status !== status) return false
      return true
    })
  }, [todas, de, ate, status])

  const totais = useMemo(() => {
    const confirmadas = filtradas.filter((s) => s.status === "confirmada")
    const somaMensal = filtradas.reduce((t, s) => t + Number(s.total_mensal), 0)
    const somaConfirmada = confirmadas.reduce(
      (t, s) => t + Number(s.total_mensal),
      0
    )
    return {
      quantidade: filtradas.length,
      confirmadas: confirmadas.length,
      somaMensal,
      somaConfirmada,
      ticketMedio: filtradas.length ? somaMensal / filtradas.length : 0,
      somaAdesao: confirmadas.reduce((t, s) => t + Number(s.taxa_adesao), 0),
      conversao: filtradas.length
        ? (confirmadas.length / filtradas.length) * 100
        : 0,
    }
  }, [filtradas])

  function exportar() {
    const cabecalho = [
      "Número", "Data", "Cliente", "Cidade", "UF", "Telefone", "Placa",
      "Marca", "Modelo", "Ano modelo", "Categoria", "Valor de mercado",
      "Rateio", "Proteção terceiros", "Assistência 24h", "Valor mensal",
      "Taxa de adesão", "Status",
    ]

    const linhas = filtradas.map((s) => [
      formatarNumeroSimulacao(s.numero),
      formatarData(s.created_at),
      s.cliente_nome,
      s.cliente_cidade ?? "",
      s.cliente_uf ?? "",
      s.cliente_telefone ?? "",
      formatarPlaca(s.veiculo_placa),
      s.veiculo_marca ?? "",
      s.veiculo_modelo ?? "",
      s.veiculo_ano_modelo?.toString() ?? "",
      s.categoria_codigo ?? "",
      String(s.valor_mercado).replace(".", ","),
      String(s.valor_rateio).replace(".", ","),
      String(s.valor_terceiros).replace(".", ","),
      String(s.valor_assistencia).replace(".", ","),
      String(s.total_mensal).replace(".", ","),
      String(s.taxa_adesao).replace(".", ","),
      STATUS_SIMULACAO[s.status].rotulo,
    ])

    baixarCsv(`relatorio-simulacoes-${de}-a-${ate}.csv`, [cabecalho, ...linhas])
    toast.success(`${filtradas.length} simulações exportadas.`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relatório por período</CardTitle>
          <CardDescription>
            Filtre pela data de criação e exporte para planilha.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="de">De</Label>
            <Input
              id="de"
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ate">Até</Label>
            <Input
              id="ate"
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-rel">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusSimulacao | "todas")}
            >
              <SelectTrigger id="status-rel" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {(Object.keys(STATUS_SIMULACAO) as StatusSimulacao[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_SIMULACAO[s].rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={exportar}
            disabled={filtradas.length === 0}
            className="gap-1.5"
          >
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { rotulo: "Simulações no período", valor: String(totais.quantidade) },
          {
            rotulo: "Confirmadas",
            valor: `${totais.confirmadas} (${totais.conversao.toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}%)`,
          },
          { rotulo: "Ticket médio mensal", valor: formatarMoeda(totais.ticketMedio) },
          {
            rotulo: "Mensalidade confirmada",
            valor: formatarMoeda(totais.somaConfirmada),
          },
        ].map((item) => (
          <Card key={item.rotulo}>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">{item.rotulo}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {item.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento</CardTitle>
          <CardDescription>
            {filtradas.length} simulações · taxa de adesão somada:{" "}
            {formatarMoeda(totais.somaAdesao)}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {carregando ? (
            <div className="flex justify-center py-10">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BarChart3 className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">
                Nenhuma simulação neste período.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-right">Mercado</TableHead>
                    <TableHead className="text-right">Mensal</TableHead>
                    <TableHead className="text-right">Adesão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {formatarNumeroSimulacao(s.numero)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatarData(s.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {s.cliente_nome}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatarPlaca(s.veiculo_placa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarMoeda(s.valor_mercado)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatarMoeda(s.total_mensal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarMoeda(s.taxa_adesao)}
                      </TableCell>
                      <TableCell>
                        <EtiquetaStatus status={s.status} />
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
