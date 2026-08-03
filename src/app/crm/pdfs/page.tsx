"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileDown, Files } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EtiquetaStatus } from "@/components/crm/etiquetas"
import { listarPdfs, urlAssinadaPdf, type PdfComSimulacao } from "@/lib/crm/queries"
import { formatarDataHora, formatarPlaca } from "@/lib/crm/format"

export default function PaginaPdfs() {
  const [pdfs, setPdfs] = useState<PdfComSimulacao[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarPdfs()
      .then((lista) => ativo && setPdfs(lista))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
      )
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  async function abrir(caminho: string) {
    try {
      const url = await urlAssinadaPdf(caminho)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir o PDF.")
    }
  }

  return (
    <Card>
      <CardContent className="px-0">
        {carregando ? (
          <div className="space-y-2 px-6 py-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <Files className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Nenhum PDF arquivado</p>
              <p className="text-muted-foreground text-sm">
                Cada proposta gerada fica guardada aqui, com versão e data.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Placa</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Gerado em</TableHead>
                  <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdfs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/crm/simulacoes/${p.simulacao_id}`}
                        className="hover:underline"
                      >
                        {p.simulacao?.numero ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {p.simulacao?.cliente?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono sm:table-cell">
                      {p.simulacao?.veiculo?.placa
                        ? formatarPlaca(p.simulacao.veiculo.placa)
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">v{p.versao}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.simulacao?.status && (
                        <EtiquetaStatus status={p.simulacao.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {formatarDataHora(p.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void abrir(p.storage_path)}
                        className="gap-1.5"
                      >
                        <FileDown className="size-4" />
                        Abrir
                      </Button>
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
