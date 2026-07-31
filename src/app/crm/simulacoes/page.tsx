"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Copy,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { EtiquetaCategoria, EtiquetaStatus } from "@/components/crm/etiquetas"
import { useCrm } from "@/components/crm/provedor-crm"
import {
  duplicarSimulacao,
  excluirSimulacao,
  listarSimulacoes,
  obterSimulacaoCompleta,
} from "@/lib/crm/queries"
import {
  formatarData,
  formatarMoeda,
  formatarNumeroSimulacao,
  formatarPlaca,
} from "@/lib/crm/format"
import { STATUS_SIMULACAO, type SimulacaoDetalhe, type StatusSimulacao } from "@/lib/crm/types"

export default function PaginaSimulacoes() {
  const router = useRouter()
  const { categorias, configuracoes } = useCrm()

  const [simulacoes, setSimulacoes] = useState<SimulacaoDetalhe[]>([])
  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState<StatusSimulacao | "todas">("todas")
  const [carregando, setCarregando] = useState(true)
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [paraExcluir, setParaExcluir] = useState<SimulacaoDetalhe | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setSimulacoes(await listarSimulacoes({ busca, status }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [busca, status])

  useEffect(() => {
    const t = setTimeout(() => void carregar(), busca ? 350 : 0)
    return () => clearTimeout(t)
  }, [carregar, busca])

  async function regerarPdf(simulacao: SimulacaoDetalhe) {
    if (!configuracoes) return
    setGerandoId(simulacao.id)
    try {
      const dados = await obterSimulacaoCompleta(simulacao.id)
      const resultado = await (await import("@/lib/crm/pdf/gerar")).gerarEBaixarProposta({
        simulacao: dados.simulacao,
        cliente: dados.cliente,
        veiculo: dados.veiculo,
        categoria:
          categorias.find((c) => c.id === dados.simulacao.categoria_id) ?? null,
        configuracoes,
      })
      toast.success(
        resultado.arquivado
          ? "PDF gerado e arquivado."
          : "PDF gerado (não foi possível arquivar)."
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o PDF.")
    } finally {
      setGerandoId(null)
    }
  }

  async function duplicar(id: string) {
    try {
      const novo = await duplicarSimulacao(id)
      toast.success("Simulação duplicada.")
      router.push(`/crm/simulacoes/${novo}/editar`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao duplicar.")
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    try {
      await excluirSimulacao(paraExcluir.id)
      toast.success(
        `Simulação ${formatarNumeroSimulacao(paraExcluir.numero)} excluída.`
      )
      setParaExcluir(null)
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, placa, modelo ou telefone…"
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => setStatus(v as StatusSimulacao | "todas")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            {(Object.keys(STATUS_SIMULACAO) as StatusSimulacao[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_SIMULACAO[s].rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button asChild className="gap-1.5">
          <Link href="/crm/simulacoes/nova">
            <FilePlus2 className="size-4" />
            Nova
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="px-0">
          {carregando ? (
            <div className="space-y-2 px-6 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : simulacoes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FileText className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nenhuma simulação encontrada</p>
                <p className="text-muted-foreground text-sm">
                  {busca || status !== "todas"
                    ? "Tente outro termo ou limpe os filtros."
                    : "Crie a primeira proposta para começar."}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/crm/simulacoes/nova">Nova simulação</Link>
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
                    <TableHead className="hidden lg:table-cell">Veículo</TableHead>
                    <TableHead>Cat.</TableHead>
                    <TableHead className="text-right">Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulacoes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/crm/simulacoes/${s.id}`}
                          className="hover:underline"
                        >
                          {formatarNumeroSimulacao(s.numero)}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        <Link
                          href={`/crm/simulacoes/${s.id}`}
                          className="hover:underline"
                        >
                          {s.cliente_nome}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatarPlaca(s.veiculo_placa)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-[220px] truncate lg:table-cell">
                        {[s.veiculo_marca, s.veiculo_modelo].filter(Boolean).join(" ") ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <EtiquetaCategoria codigo={s.categoria_codigo} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatarMoeda(s.valor_mensal)}
                      </TableCell>
                      <TableCell>
                        <EtiquetaStatus status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                        {formatarData(s.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              {gerandoId === s.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                              <Link href={`/crm/simulacoes/${s.id}`}>
                                <Eye className="size-4" />
                                Visualizar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/crm/simulacoes/${s.id}/editar`}>
                                <Pencil className="size-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void regerarPdf(s)}>
                              <FileDown className="size-4" />
                              Gerar PDF novamente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void duplicar(s.id)}>
                              <Copy className="size-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setParaExcluir(s)}
                            >
                              <Trash2 className="size-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(aberto) => !aberto && setParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              A simulação {paraExcluir && formatarNumeroSimulacao(paraExcluir.numero)}{" "}
              de {paraExcluir?.cliente_nome} será removida junto com os PDFs
              arquivados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
