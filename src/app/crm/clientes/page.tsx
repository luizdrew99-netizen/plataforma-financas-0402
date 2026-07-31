"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
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
import { listarClientes } from "@/lib/crm/queries"
import {
  formatarCnpj,
  formatarCpf,
  formatarData,
  formatarTelefone,
} from "@/lib/crm/format"
import type { Cliente } from "@/lib/crm/types"

export default function PaginaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setClientes(await listarClientes(busca))
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
          placeholder="Buscar por nome, CPF, CNPJ, telefone ou cidade…"
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
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Users className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nenhum cliente encontrado</p>
                <p className="text-muted-foreground text-sm">
                  Os clientes são criados junto com a primeira simulação.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">
                      CPF / CNPJ
                    </TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">
                        <Link
                          href={`/crm/clientes/${c.id}`}
                          className="hover:underline"
                        >
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                        {c.tipo_pessoa === "pj" ? "Jurídica" : "Física"}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">
                        {c.cnpj
                          ? formatarCnpj(c.cnpj)
                          : c.cpf
                            ? formatarCpf(c.cpf)
                            : "—"}
                      </TableCell>
                      <TableCell>{formatarTelefone(c.telefone) || "—"}</TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell">
                        {[c.cidade, c.uf].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                        {formatarData(c.created_at)}
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
