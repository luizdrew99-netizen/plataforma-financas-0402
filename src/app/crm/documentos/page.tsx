"use client"

/**
 * Todos os documentos anexados, de todos os clientes e veículos.
 * O envio acontece dentro do cadastro do cliente — aqui é consulta.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Image as IconeImagem, Paperclip, Search } from "lucide-react"
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
import {
  TIPOS_DOCUMENTO,
  listarDocumentos,
  urlAssinadaDocumento,
  type DocumentoComRelacoes,
} from "@/lib/crm/queries"
import { formatarDataHora, formatarPlaca } from "@/lib/crm/format"

const ROTULO_TIPO = Object.fromEntries(
  TIPOS_DOCUMENTO.map((t) => [t.valor, t.rotulo])
) as Record<string, string>

export default function PaginaDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoComRelacoes[]>([])
  const [busca, setBusca] = useState("")
  const [tipo, setTipo] = useState("todos")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarDocumentos()
      .then((lista) => ativo && setDocumentos(lista))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
      )
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  // A lista já vem inteira do banco; filtrar aqui evita ida e volta a cada tecla.
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return documentos.filter((d) => {
      if (tipo !== "todos" && d.tipo !== tipo) return false
      if (!termo) return true
      return [
        d.nome_arquivo,
        d.cliente?.nome,
        d.veiculo?.placa,
        ROTULO_TIPO[d.tipo] ?? d.tipo,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo))
    })
  }, [documentos, busca, tipo])

  async function abrir(caminho: string) {
    try {
      window.open(await urlAssinadaDocumento(caminho), "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por arquivo, cliente ou placa…"
            className="pl-8"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_DOCUMENTO.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="px-0">
          {carregando ? (
            <div className="space-y-2 px-6 py-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Paperclip className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Nenhum documento encontrado</p>
                <p className="text-muted-foreground text-sm">
                  Os arquivos são anexados dentro do cadastro do cliente.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Veículo</TableHead>
                    <TableHead className="hidden lg:table-cell">Enviado em</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[260px]">
                        <span className="flex items-center gap-2">
                          {/\.(png|jpe?g|webp|gif|heic)$/i.test(d.nome_arquivo) ? (
                            <IconeImagem className="text-muted-foreground size-4 shrink-0" />
                          ) : (
                            <FileText className="text-muted-foreground size-4 shrink-0" />
                          )}
                          <span className="truncate font-medium">{d.nome_arquivo}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ROTULO_TIPO[d.tipo] ?? d.tipo}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                        {d.cliente ? (
                          <Link
                            href={`/crm/clientes/${d.cliente.id}`}
                            className="hover:underline"
                          >
                            {d.cliente.nome}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono sm:table-cell">
                        {d.veiculo ? formatarPlaca(d.veiculo.placa) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                        {formatarDataHora(d.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void abrir(d.storage_path)}
                        >
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
    </div>
  )
}
