"use client"

/**
 * Lista e envio de documentos (CRLV, CNH, contrato social, fotos…).
 * Serve para cliente e para veículo — quem chama diz a que o arquivo pertence.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  FileText,
  Image as IconeImagem,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCrm } from "./provedor-crm"
import {
  TIPOS_DOCUMENTO,
  enviarDocumento,
  excluirDocumento,
  listarDocumentos,
  urlAssinadaDocumento,
  type DocumentoComRelacoes,
} from "@/lib/crm/queries"
import { formatarDataHora } from "@/lib/crm/format"

const ROTULO_TIPO = Object.fromEntries(
  TIPOS_DOCUMENTO.map((t) => [t.valor, t.rotulo])
) as Record<string, string>

function ehImagem(nome: string) {
  return /\.(png|jpe?g|webp|gif|heic)$/i.test(nome)
}

export function GestorDocumentos({
  clienteId,
  veiculoId,
  descricao,
}: {
  clienteId?: string
  veiculoId?: string
  descricao?: string
}) {
  const { temPapel } = useCrm()
  const podeExcluir = temPapel("admin", "supervisor")

  const [documentos, setDocumentos] = useState<DocumentoComRelacoes[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [tipo, setTipo] = useState<string>(TIPOS_DOCUMENTO[0].valor)
  const [paraExcluir, setParaExcluir] = useState<DocumentoComRelacoes | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setDocumentos(await listarDocumentos({ clienteId, veiculoId }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [clienteId, veiculoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Limpa o input já: escolher o mesmo arquivo de novo tem que disparar.
    evento.target.value = ""
    if (!arquivo) return

    setEnviando(true)
    try {
      await enviarDocumento(arquivo, { clienteId, veiculoId, tipo })
      toast.success(`${arquivo.name} enviado.`)
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.")
    } finally {
      setEnviando(false)
    }
  }

  async function abrir(caminho: string) {
    try {
      window.open(await urlAssinadaDocumento(caminho), "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir.")
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    try {
      await excluirDocumento(paraExcluir.id, paraExcluir.storage_path)
      toast.success("Documento excluído.")
      setParaExcluir(null)
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.")
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Documentos</CardTitle>
            <CardDescription>
              {descricao ?? "CRLV, CNH, contrato social, fotos e laudos. Até 15 MB por arquivo."}
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DOCUMENTO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={aoEscolherArquivo}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
            />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Enviar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {carregando ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Paperclip className="text-muted-foreground size-7" />
              <p className="text-muted-foreground text-sm">
                Nenhum documento anexado ainda.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {documentos.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                    {ehImagem(d.nome_arquivo) ? (
                      <IconeImagem className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => void abrir(d.storage_path)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium hover:underline">
                      {d.nome_arquivo}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {ROTULO_TIPO[d.tipo] ?? d.tipo} · {formatarDataHora(d.created_at)}
                    </span>
                  </button>

                  {podeExcluir && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Excluir ${d.nome_arquivo}`}
                      onClick={() => setParaExcluir(d)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(aberto) => !aberto && setParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              {paraExcluir?.nome_arquivo} será removido do cadastro e do
              armazenamento. Esta ação não pode ser desfeita.
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
    </>
  )
}
