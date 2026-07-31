"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
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
import {
  atualizarCadastro,
  listarCadastros,
  type CadastroComRelacoes,
} from "@/lib/crm/queries"
import { formatarData, formatarMoeda, formatarPlaca } from "@/lib/crm/format"
import { SITUACAO_CADASTRO, type SituacaoCadastro } from "@/lib/crm/types"

export default function PaginaCadastros() {
  const [cadastros, setCadastros] = useState<CadastroComRelacoes[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try {
      setCadastros(await listarCadastros())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function mudarSituacao(id: string, situacao: SituacaoCadastro) {
    // Atualiza a tela na hora e desfaz se o banco recusar.
    const anterior = cadastros
    setCadastros((atual) =>
      atual.map((c) => (c.id === id ? { ...c, situacao } : c))
    )
    try {
      await atualizarCadastro(id, { situacao })
      toast.success("Situação atualizada.")
    } catch (e) {
      setCadastros(anterior)
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

  return (
    <Card>
      <CardContent className="px-0">
        {cadastros.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <ShieldCheck className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Nenhum cadastro definitivo</p>
              <p className="text-muted-foreground text-sm">
                Confirme uma simulação para gerar o primeiro contrato.
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
                  <TableHead className="hidden lg:table-cell">Veículo</TableHead>
                  <TableHead className="text-right">Mensal</TableHead>
                  <TableHead className="hidden md:table-cell">Contratação</TableHead>
                  <TableHead className="w-44">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cadastros.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      #{String(c.numero).padStart(6, "0")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
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
                    <TableCell className="text-muted-foreground hidden max-w-[200px] truncate lg:table-cell">
                      {[c.veiculo?.marca, c.veiculo?.modelo]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatarMoeda(c.valor_mensal)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {formatarData(c.data_contratacao)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.situacao}
                        onValueChange={(v) =>
                          void mudarSituacao(c.id, v as SituacaoCadastro)
                        }
                      >
                        <SelectTrigger className="w-full" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(SITUACAO_CADASTRO) as SituacaoCadastro[]
                          ).map((s) => (
                            <SelectItem key={s} value={s}>
                              {SITUACAO_CADASTRO[s].rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
