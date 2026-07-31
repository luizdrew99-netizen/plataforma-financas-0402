"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileDown,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  ShieldCheck,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  EtiquetaCategoria,
  EtiquetaSituacao,
  EtiquetaStatus,
} from "@/components/crm/etiquetas"
import { useCrm } from "@/components/crm/provedor-crm"
import {
  confirmarSimulacao,
  duplicarSimulacao,
  listarPdfs,
  obterSimulacao,
  obterSimulacaoCompleta,
  urlAssinadaPdf,
  type PdfComSimulacao,
} from "@/lib/crm/queries"
import { linkPublicoProposta } from "@/lib/crm/pdf/link"
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarNumeroSimulacao,
  formatarPlaca,
  somenteDigitos,
} from "@/lib/crm/format"
import { descreverFaixa } from "@/lib/crm/calc"
import { RESTRICOES_VEICULO, type SimulacaoDetalhe } from "@/lib/crm/types"

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{rotulo}</p>
      <p className="text-sm font-medium">{valor || "—"}</p>
    </div>
  )
}

export default function PaginaDetalheSimulacao() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { configuracoes } = useCrm()

  const [simulacao, setSimulacao] = useState<SimulacaoDetalhe | null>(null)
  const [pdfs, setPdfs] = useState<PdfComSimulacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [dialogoConfirmar, setDialogoConfirmar] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [dados, lista] = await Promise.all([obterSimulacao(id), listarPdfs(id)])
      setSimulacao(dados)
      setPdfs(lista)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const linkPublico = simulacao ? linkPublicoProposta(simulacao.token_publico) : ""

  async function gerarPdf() {
    if (!configuracoes || !simulacao) return
    setGerando(true)
    try {
      const dados = await obterSimulacaoCompleta(simulacao.id)
      const resultado = await (await import("@/lib/crm/pdf/gerar")).gerarEBaixarProposta({
        simulacao: dados.simulacao,
        cliente: dados.cliente,
        veiculo: dados.veiculo,
        configuracoes,
      })
      toast.success(
        resultado.arquivado
          ? "PDF gerado e arquivado."
          : "PDF gerado (não foi possível arquivar)."
      )
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o PDF.")
    } finally {
      setGerando(false)
    }
  }

  async function confirmar() {
    if (!simulacao) return
    setConfirmando(true)
    try {
      const cadastro = await confirmarSimulacao(simulacao.id)
      toast.success(
        `Simulação confirmada. Contrato ${cadastro.numero} criado.`
      )
      setDialogoConfirmar(false)
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao confirmar.")
    } finally {
      setConfirmando(false)
    }
  }

  async function baixarVersao(caminho: string) {
    try {
      const url = await urlAssinadaPdf(caminho)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir o PDF.")
    }
  }

  function copiarLink() {
    void navigator.clipboard.writeText(linkPublico)
    toast.success("Link da proposta copiado.")
  }

  function compartilharWhatsApp() {
    if (!simulacao) return
    const texto =
      `Olá, ${simulacao.cliente_nome}! Segue a simulação de proteção veicular ` +
      `do caminhão placa ${formatarPlaca(simulacao.veiculo_placa)}.\n\n` +
      `Valor mensal: ${formatarMoeda(simulacao.total_mensal)}\n` +
      `Taxa de adesão: ${formatarMoeda(simulacao.taxa_adesao)}\n\n` +
      `Proposta completa: ${linkPublico}`
    const numero = somenteDigitos(simulacao.cliente_telefone)
    const destino = numero ? `https://wa.me/55${numero}?text=` : "https://wa.me/?text="
    window.open(destino + encodeURIComponent(texto), "_blank", "noopener,noreferrer")
  }

  function compartilharEmail() {
    if (!simulacao) return
    const assunto = `Simulação de proteção veicular — ${formatarPlaca(simulacao.veiculo_placa)}`
    const corpo =
      `Olá, ${simulacao.cliente_nome}!\n\n` +
      `Segue a simulação de proteção veicular do caminhão placa ` +
      `${formatarPlaca(simulacao.veiculo_placa)}.\n\n` +
      `Valor mensal: ${formatarMoeda(simulacao.total_mensal)}\n` +
      `Taxa de adesão: ${formatarMoeda(simulacao.taxa_adesao)}\n\n` +
      `Proposta completa: ${linkPublico}\n`
    window.location.href = `mailto:?subject=${encodeURIComponent(
      assunto
    )}&body=${encodeURIComponent(corpo)}`
  }

  async function duplicar() {
    if (!simulacao) return
    try {
      const novo = await duplicarSimulacao(simulacao.id)
      toast.success("Simulação duplicada.")
      router.push(`/crm/simulacoes/${novo}/editar`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao duplicar.")
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!simulacao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulação não encontrada</CardTitle>
          <CardDescription>
            Ela pode ter sido excluída por outro usuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/crm/simulacoes">Voltar para a lista</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const restricoes = simulacao.veiculo_restricoes ?? []

  return (
    <div className="space-y-5">
      {/* Cabeçalho da proposta */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <Link href="/crm/simulacoes" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">
                {formatarNumeroSimulacao(simulacao.numero)}
              </h2>
              <EtiquetaStatus status={simulacao.status} />
              {simulacao.contrato_situacao && (
                <EtiquetaSituacao situacao={simulacao.contrato_situacao} />
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {simulacao.cliente_nome} · {formatarPlaca(simulacao.veiculo_placa)} ·{" "}
              {formatarData(simulacao.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={compartilharWhatsApp} className="gap-1.5">
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={compartilharEmail} className="gap-1.5">
            <Mail className="size-4" />
            E-mail
          </Button>
          <Button variant="outline" size="sm" onClick={copiarLink} className="gap-1.5">
            <Link2 className="size-4" />
            Copiar link
          </Button>
          <Button variant="outline" size="sm" onClick={() => void duplicar()} className="gap-1.5">
            <Copy className="size-4" />
            Duplicar
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/crm/simulacoes/${simulacao.id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
          <Button size="sm" onClick={() => void gerarPdf()} disabled={gerando} className="gap-1.5">
            {gerando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Gerar PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Dado rotulo="Nome" valor={simulacao.cliente_nome} />
              <Dado rotulo="Telefone" valor={simulacao.cliente_telefone} />
              <Dado
                rotulo="Cidade / UF"
                valor={[simulacao.cliente_cidade, simulacao.cliente_uf]
                  .filter(Boolean)
                  .join(" / ")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Veículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Dado
                  rotulo="Placa"
                  valor={
                    <span className="font-mono">
                      {formatarPlaca(simulacao.veiculo_placa)}
                    </span>
                  }
                />
                <Dado
                  rotulo="Marca / Modelo"
                  valor={[simulacao.veiculo_marca, simulacao.veiculo_modelo]
                    .filter(Boolean)
                    .join(" ")}
                />
                <Dado
                  rotulo="Ano fab. / modelo"
                  valor={[simulacao.veiculo_ano_fabricacao, simulacao.veiculo_ano_modelo]
                    .filter(Boolean)
                    .join(" / ")}
                />
                <Dado
                  rotulo="Valor de mercado"
                  valor={formatarMoeda(simulacao.valor_mercado)}
                />
                <div>
                  <p className="text-muted-foreground text-xs">Categoria</p>
                  <div className="mt-1 flex items-center gap-2">
                    <EtiquetaCategoria codigo={simulacao.categoria_codigo} />
                    <span className="text-muted-foreground text-xs">
                      {descreverFaixa(
                        simulacao.categoria_valor_min !== null
                          ? {
                              valor_min: simulacao.categoria_valor_min,
                              valor_max: simulacao.categoria_valor_max,
                            }
                          : null
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {(restricoes.length > 0 || !!simulacao.veiculo_restricoes_descricao) && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Situação declarada
                  </p>
                  {restricoes.length > 0 && (
                    <p className="mt-1 text-sm">
                      {restricoes
                        .map(
                          (r) =>
                            RESTRICOES_VEICULO.find((item) => item.valor === r)?.rotulo ?? r
                        )
                        .join(" · ")}
                    </p>
                  )}
                  {!!simulacao.veiculo_restricoes_descricao && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {simulacao.veiculo_restricoes_descricao}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Coberturas e benefícios</CardTitle>
              <CardDescription>
                Como ficaram gravados nesta proposta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(simulacao.snapshot?.coberturas ?? []).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {c.nome}
                  </li>
                ))}
              </ul>

              {(simulacao.snapshot?.beneficios ?? []).map((b, i) => (
                <div key={b.codigo ?? i} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Benefício {i + 1}
                      </p>
                      <p className="font-medium">{b.nome}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatarMoeda(b.valor)}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-2 whitespace-pre-line text-xs">
                    {b.descricao}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {!!simulacao.observacoes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm">{simulacao.observacoes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PDFs gerados</CardTitle>
              <CardDescription>
                Cada geração vira uma versão arquivada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pdfs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum PDF arquivado ainda.
                </p>
              ) : (
                <ul className="divide-y">
                  {pdfs.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Versão {p.versao}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatarDataHora(p.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void baixarVersao(p.storage_path)}
                        className="gap-1.5"
                      >
                        <FileDown className="size-4" />
                        Abrir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna de valores */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rateio</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(simulacao.valor_rateio)}
                </span>
              </div>
              {(simulacao.snapshot?.beneficios ?? []).map((b, i) => (
                <div
                  key={b.codigo ?? i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-muted-foreground truncate">{b.nome}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatarMoeda(b.valor)}
                  </span>
                </div>
              ))}

              <Separator />

              <div className="rounded-lg bg-[#0E2A47] p-3 text-white">
                <p className="text-[11px] uppercase tracking-wide text-[#9FB6CC]">
                  Valor mensal
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatarMoeda(simulacao.total_mensal)}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de adesão</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(simulacao.taxa_adesao)}
                </span>
              </div>

              <Separator />

              {simulacao.contrato_id ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <p className="text-sm font-medium">Simulação confirmada</p>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Contrato {simulacao.contrato_numero}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                    <Link href="/crm/contratos">Ver contratos</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-1.5"
                  onClick={() => setDialogoConfirmar(true)}
                >
                  <CheckCircle2 className="size-4" />
                  Confirmar simulação
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={dialogoConfirmar} onOpenChange={setDialogoConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar esta simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta {simulacao.numero} vira um contrato
              com situação <strong>pendente</strong>, pronto para você
              completar os dados de pessoa física ou jurídica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar} disabled={confirmando}>
              {confirmando && <Loader2 className="size-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
