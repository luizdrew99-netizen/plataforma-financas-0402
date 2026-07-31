"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Truck } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listarVeiculos, type VeiculoComCliente } from "@/lib/crm/queries"
import { formatarPlaca } from "@/lib/crm/format"
import { RESTRICOES_VEICULO } from "@/lib/crm/types"

function ListaVeiculos() {
  const parametros = useSearchParams()
  const [veiculos, setVeiculos] = useState<VeiculoComCliente[]>([])
  const [busca, setBusca] = useState(parametros.get("busca") ?? "")
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setVeiculos(await listarVeiculos(busca))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [busca])

  useEffect(() => {
    const t = setTimeout(() => void carregar(), busca ? 350 : 0)
    return () => clearTimeout(t)
  }, [carregar, busca])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por placa, marca, modelo ou chassi…"
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="px-0">
          {carregando ? (
            <div className="space-y-2 px-6 py-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : veiculos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Truck className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nenhum veículo encontrado</p>
                <p className="text-muted-foreground text-sm">
                  Os veículos são cadastrados junto com a simulação.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead className="hidden sm:table-cell">Ano</TableHead>
                    <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                    <TableHead className="hidden xl:table-cell">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {veiculos.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-medium">
                        {formatarPlaca(v.placa)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {[v.ano_fabricacao, v.ano_modelo].filter(Boolean).join("/") ||
                          "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-[200px] truncate lg:table-cell">
                        {v.cliente?.nome ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-[220px] truncate text-xs xl:table-cell">
                        {(v.restricoes ?? []).length === 0
                          ? "Sem restrições"
                          : (v.restricoes ?? [])
                              .map(
                                (r) =>
                                  RESTRICOES_VEICULO.find((i) => i.valor === r)
                                    ?.rotulo ?? r
                              )
                              .join(", ")}
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

export default function PaginaVeiculos() {
  // useSearchParams exige limite de Suspense no App Router.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ListaVeiculos />
    </Suspense>
  )
}
