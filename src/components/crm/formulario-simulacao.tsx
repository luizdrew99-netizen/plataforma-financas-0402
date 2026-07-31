"use client"

/**
 * Formulário de simulação em etapas. Serve para criar e para editar — na
 * edição os ids de cliente/veículo/simulação viajam no payload e a RPC
 * `crm_salvar_simulacao` decide entre inserir e atualizar.
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  Loader2,
  Save,
  Truck,
  User,
  Wallet,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { CampoMoeda } from "./campo-moeda"
import { EtiquetaCategoria } from "./etiquetas"
import { useCrm } from "./provedor-crm"
import { calcularTotais, descreverFaixa, resolverCategoria, validarSimulacao } from "@/lib/crm/calc"
import { formatarMoeda, formatarPlaca, placaValida } from "@/lib/crm/format"
import { obterSimulacaoCompleta, salvarSimulacao } from "@/lib/crm/queries"
import {
  CODIGO_ASSISTENCIA,
  CODIGO_TERCEIROS,
  ESTADOS_BR,
  RESTRICOES_VEICULO,
  type Cliente,
  type RestricaoVeiculo,
  type Simulacao,
  type Veiculo,
} from "@/lib/crm/types"

const ETAPAS = [
  { titulo: "Cliente", icone: User },
  { titulo: "Veículo", icone: Truck },
  { titulo: "Coberturas", icone: ShieldCheck },
  { titulo: "Valores", icone: Wallet },
] as const

interface FormularioCliente {
  id?: string | null
  nome: string
  telefone: string
  whatsapp: string
  email: string
  cidade: string
  uf: string
  observacoes: string
}

interface FormularioVeiculo {
  id?: string | null
  placa: string
  marca: string
  modelo: string
  anoModelo: string
  anoFabricacao: string
  valorMercado: number
  restricoes: RestricaoVeiculo[]
  restricoesDescricao: string
  observacoes: string
}

interface FormularioBeneficio {
  codigo: string
  nome: string
  descricao: string
  valor: number
  incluido: boolean
}

export interface SimulacaoParaEdicao {
  simulacao: Simulacao
  cliente: Cliente
  veiculo: Veiculo
}

export function FormularioSimulacao({
  existente,
}: {
  existente?: SimulacaoParaEdicao
}) {
  const router = useRouter()
  const { categorias, coberturas, beneficios, configuracoes } = useCrm()

  const editando = !!existente

  const [etapa, setEtapa] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)

  const [cliente, setCliente] = useState<FormularioCliente>(() => ({
    id: existente?.cliente.id ?? null,
    nome: existente?.cliente.nome ?? "",
    telefone: existente?.cliente.telefone ?? "",
    whatsapp: existente?.cliente.whatsapp ?? "",
    email: existente?.cliente.email ?? "",
    cidade: existente?.cliente.cidade ?? "",
    uf: existente?.cliente.uf ?? "",
    observacoes: existente?.cliente.observacoes ?? "",
  }))

  const [veiculo, setVeiculo] = useState<FormularioVeiculo>(() => ({
    id: existente?.veiculo.id ?? null,
    placa: existente?.veiculo.placa ?? "",
    marca: existente?.veiculo.marca ?? "",
    modelo: existente?.veiculo.modelo ?? "",
    anoModelo: existente?.veiculo.ano_modelo?.toString() ?? "",
    anoFabricacao: existente?.veiculo.ano_fabricacao?.toString() ?? "",
    // O valor de mercado é da simulação: o mesmo caminhão pode ser
    // reavaliado em datas diferentes.
    valorMercado: Number(existente?.simulacao.valor_mercado ?? 0),
    restricoes: (existente?.veiculo.restricoes ?? []) as RestricaoVeiculo[],
    restricoesDescricao: existente?.veiculo.restricoes_descricao ?? "",
    observacoes: existente?.veiculo.observacoes ?? "",
  }))

  const [coberturasSelecionadas, setCoberturasSelecionadas] = useState<string[]>(
    () => {
      if (existente) {
        const nomes = new Set(
          (existente.simulacao.snapshot?.coberturas ?? []).map((c) => c.nome)
        )
        return coberturas.filter((c) => nomes.has(c.nome)).map((c) => c.id)
      }
      return coberturas.filter((c) => c.ativo && c.padrao).map((c) => c.id)
    }
  )

  const [beneficiosForm, setBeneficiosForm] = useState<FormularioBeneficio[]>(() => {
    if (existente) {
      const gravados = existente.simulacao.snapshot?.beneficios ?? []
      // O cadastro manda a ordem; o que foi vendido manda no valor e no texto.
      return beneficios
        .filter((b) => b.ativo)
        .map((b) => {
          const gravado = gravados.find((g) => g.codigo === b.codigo)
          return {
            codigo: b.codigo,
            nome: gravado?.nome ?? b.nome,
            descricao: gravado?.descricao ?? b.descricao,
            valor: Number(gravado?.valor ?? b.valor_padrao),
            incluido: !!gravado,
          }
        })
    }
    return beneficios
      .filter((b) => b.ativo)
      .map((b) => ({
        codigo: b.codigo,
        nome: b.nome,
        descricao: b.descricao,
        valor: Number(b.valor_padrao),
        incluido: b.padrao,
      }))
  })

  const [valorRateio, setValorRateio] = useState(
    Number(existente?.simulacao.valor_rateio ?? 0)
  )
  const [rateioTocado, setRateioTocado] = useState(editando)
  const [taxaAdesao, setTaxaAdesao] = useState(
    Number(existente?.simulacao.taxa_adesao ?? configuracoes?.taxa_adesao_padrao ?? 0)
  )
  const [observacoes, setObservacoes] = useState(
    existente?.simulacao.observacoes ?? configuracoes?.observacoes_padrao ?? ""
  )

  const categoria = useMemo(
    () => resolverCategoria(veiculo.valorMercado, categorias),
    [veiculo.valorMercado, categorias]
  )

  // Preenche o rateio com o sugerido da faixa enquanto o consultor não digitar
  // um valor próprio — depois disso, não mexemos mais no que ele escreveu.
  useEffect(() => {
    if (rateioTocado) return
    if (categoria?.rateio_padrao) setValorRateio(Number(categoria.rateio_padrao))
  }, [categoria, rateioTocado])

  const beneficioPorCodigo = (codigo: string) =>
    beneficiosForm.find((b) => b.codigo === codigo && b.incluido)

  const valorTerceiros = beneficioPorCodigo(CODIGO_TERCEIROS)?.valor ?? 0
  const valorAssistencia = beneficioPorCodigo(CODIGO_ASSISTENCIA)?.valor ?? 0
  // Benefícios que o admin cadastrou além dos dois padrão entram como extras;
  // sem isso o total mensal ficaria menor do que o que foi vendido.
  const valorExtras = beneficiosForm
    .filter(
      (b) =>
        b.incluido &&
        b.codigo !== CODIGO_TERCEIROS &&
        b.codigo !== CODIGO_ASSISTENCIA
    )
    .reduce((soma, b) => soma + Number(b.valor || 0), 0)

  const totais = calcularTotais({
    valorRateio,
    valorTerceiros,
    valorAssistencia,
    valorBeneficiosExtras: valorExtras,
    taxaAdesao,
  })

  const problemas = validarSimulacao({
    clienteNome: cliente.nome,
    placa: veiculo.placa,
    valorMercado: veiculo.valorMercado,
    valorRateio,
  })

  function alternarCobertura(id: string) {
    setCoberturasSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    )
  }

  function alternarRestricao(valor: RestricaoVeiculo) {
    setVeiculo((v) => ({
      ...v,
      restricoes: v.restricoes.includes(valor)
        ? v.restricoes.filter((r) => r !== valor)
        : [...v.restricoes, valor],
    }))
  }

  function atualizarBeneficio(codigo: string, patch: Partial<FormularioBeneficio>) {
    setBeneficiosForm((atual) =>
      atual.map((b) => (b.codigo === codigo ? { ...b, ...patch } : b))
    )
  }

  function montarPayload(status: "rascunho" | "gerada") {
    const coberturasEscolhidas = coberturas
      .filter((c) => coberturasSelecionadas.includes(c.id))
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => ({ nome: c.nome, descricao: c.descricao }))

    const beneficiosEscolhidos = beneficiosForm
      .filter((b) => b.incluido)
      .map((b) => ({
        codigo: b.codigo,
        nome: b.nome,
        descricao: b.descricao,
        valor: Number(b.valor || 0),
      }))

    return {
      simulacao_id: existente?.simulacao.id ?? null,
      cliente: {
        id: cliente.id ?? null,
        nome: cliente.nome.trim(),
        telefone: cliente.telefone || null,
        whatsapp: cliente.whatsapp || null,
        email: cliente.email || null,
        cidade: cliente.cidade || null,
        uf: cliente.uf || null,
        observacoes: cliente.observacoes || null,
      },
      veiculo: {
        id: veiculo.id ?? null,
        placa: veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        marca: veiculo.marca || null,
        modelo: veiculo.modelo || null,
        ano_modelo: veiculo.anoModelo || null,
        ano_fabricacao: veiculo.anoFabricacao || null,
        restricoes: veiculo.restricoes,
        restricoes_descricao: veiculo.restricoesDescricao || null,
        observacoes: veiculo.observacoes || null,
      },
      valor_mercado: veiculo.valorMercado,
      valor_rateio: valorRateio,
      valor_terceiros: valorTerceiros,
      valor_assistencia: valorAssistencia,
      valor_beneficios_extras: valorExtras,
      taxa_adesao: taxaAdesao,
      coberturas: coberturasEscolhidas,
      beneficios: beneficiosEscolhidos,
      observacoes: observacoes || null,
      status,
    }
  }

  async function salvarRascunho() {
    if (!cliente.nome.trim()) {
      toast.error("Informe ao menos o nome do cliente para salvar o rascunho.")
      setEtapa(0)
      return
    }
    setSalvando(true)
    try {
      const id = await salvarSimulacao(montarPayload("rascunho"))
      toast.success("Rascunho salvo.")
      router.push(`/crm/simulacoes/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSalvando(false)
    }
  }

  async function gerarSimulacao() {
    if (problemas.length > 0) {
      toast.error(problemas[0].mensagem)
      setEtapa(problemas[0].campo === "clienteNome" ? 0 : problemas[0].campo === "placa" ? 1 : 3)
      return
    }
    if (!configuracoes) {
      toast.error("Configurações da empresa não carregadas.")
      return
    }

    setGerando(true)
    try {
      const id = await salvarSimulacao(montarPayload("gerada"))

      // Relê do banco: número, token público e o valor mensal calculado lá
      // são a fonte da verdade que precisa entrar no PDF.
      const salvo = await obterSimulacaoCompleta(id)

      const resultado = await (await import("@/lib/crm/pdf/gerar")).gerarEBaixarProposta({
        simulacao: salvo.simulacao,
        cliente: salvo.cliente,
        veiculo: salvo.veiculo,
        configuracoes,
      })

      if (resultado.arquivado) {
        toast.success("Proposta gerada, baixada e arquivada.")
      } else {
        toast.warning(
          "Proposta gerada e baixada, mas não foi possível arquivá-la no servidor."
        )
      }

      router.push(`/crm/simulacoes/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar a proposta.")
    } finally {
      setGerando(false)
    }
  }

  const placaInvalida = veiculo.placa.length > 0 && !placaValida(veiculo.placa)

  return (
    <div className="space-y-5">
      {/* Trilha de etapas */}
      <nav aria-label="Etapas da simulação">
        <ol className="flex items-center gap-1 overflow-x-auto pb-1">
          {ETAPAS.map((item, indice) => {
            const concluida = indice < etapa
            const atual = indice === etapa
            return (
              <li key={item.titulo} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEtapa(indice)}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    atual && "border-primary bg-primary/5",
                    concluida && "border-emerald-500/40 bg-emerald-500/5",
                    !atual && !concluida && "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      atual && "border-primary bg-primary text-primary-foreground",
                      concluida && "border-emerald-500 bg-emerald-500 text-white"
                    )}
                  >
                    {concluida ? <Check className="size-3.5" /> : indice + 1}
                  </span>
                  <span className="hidden truncate text-sm font-medium sm:inline">
                    {item.titulo}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* Etapa 1 — Cliente */}
          {etapa === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados do cliente</CardTitle>
                <CardDescription>
                  O mínimo para emitir a proposta. O cadastro completo vem depois da
                  confirmação.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cliente-nome">Nome *</Label>
                  <Input
                    id="cliente-nome"
                    value={cliente.nome}
                    onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                    placeholder="Nome completo ou razão social"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cliente-telefone">Telefone</Label>
                  <Input
                    id="cliente-telefone"
                    value={cliente.telefone}
                    onChange={(e) =>
                      setCliente({ ...cliente, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cliente-whatsapp">WhatsApp</Label>
                  <Input
                    id="cliente-whatsapp"
                    value={cliente.whatsapp}
                    onChange={(e) =>
                      setCliente({ ...cliente, whatsapp: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cliente-cidade">Cidade</Label>
                  <Input
                    id="cliente-cidade"
                    value={cliente.cidade}
                    onChange={(e) => setCliente({ ...cliente, cidade: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cliente-uf">Estado</Label>
                  <Select
                    value={cliente.uf || undefined}
                    onValueChange={(v) => setCliente({ ...cliente, uf: v })}
                  >
                    <SelectTrigger id="cliente-uf" className="w-full">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cliente-obs">Observações</Label>
                  <Textarea
                    id="cliente-obs"
                    rows={3}
                    value={cliente.observacoes}
                    onChange={(e) =>
                      setCliente({ ...cliente, observacoes: e.target.value })
                    }
                    placeholder="Anotações internas sobre o cliente"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Etapa 2 — Veículo */}
          {etapa === 1 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dados do veículo</CardTitle>
                  <CardDescription>
                    A categoria é definida automaticamente pelo valor de mercado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-placa">Placa *</Label>
                    <Input
                      id="veiculo-placa"
                      value={veiculo.placa}
                      onChange={(e) =>
                        setVeiculo({
                          ...veiculo,
                          placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        })
                      }
                      placeholder="ABC1D23"
                      maxLength={7}
                      className="font-mono uppercase"
                      aria-invalid={placaInvalida}
                    />
                    {placaInvalida && (
                      <p className="text-destructive text-xs">
                        Placa fora do padrão Mercosul (ABC1D23) ou antigo (ABC1234).
                      </p>
                    )}
                  </div>

                  <CampoMoeda
                    id="veiculo-valor"
                    rotulo="Valor de mercado *"
                    valor={veiculo.valorMercado}
                    onChange={(v) => setVeiculo({ ...veiculo, valorMercado: v })}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-marca">Marca</Label>
                    <Input
                      id="veiculo-marca"
                      value={veiculo.marca}
                      onChange={(e) => setVeiculo({ ...veiculo, marca: e.target.value })}
                      placeholder="SCANIA"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-modelo">Modelo</Label>
                    <Input
                      id="veiculo-modelo"
                      value={veiculo.modelo}
                      onChange={(e) => setVeiculo({ ...veiculo, modelo: e.target.value })}
                      placeholder="P360 A6X2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-ano-fab">Ano de fabricação</Label>
                    <Input
                      id="veiculo-ano-fab"
                      value={veiculo.anoFabricacao}
                      onChange={(e) =>
                        setVeiculo({
                          ...veiculo,
                          anoFabricacao: e.target.value.replace(/\D/g, "").slice(0, 4),
                        })
                      }
                      placeholder="2014"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-ano-mod">Ano do modelo</Label>
                    <Input
                      id="veiculo-ano-mod"
                      value={veiculo.anoModelo}
                      onChange={(e) =>
                        setVeiculo({
                          ...veiculo,
                          anoModelo: e.target.value.replace(/\D/g, "").slice(0, 4),
                        })
                      }
                      placeholder="2014"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Categoria calculada
                      </p>
                      <p className="text-sm font-medium">{descreverFaixa(categoria)}</p>
                    </div>
                    <EtiquetaCategoria codigo={categoria?.codigo} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Situação do veículo</CardTitle>
                  <CardDescription>
                    Marque o que se aplica — isso vai impresso na proposta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {RESTRICOES_VEICULO.map((item) => (
                      <label
                        key={item.valor}
                        className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 transition-colors"
                      >
                        <Checkbox
                          checked={veiculo.restricoes.includes(item.valor)}
                          onCheckedChange={() => alternarRestricao(item.valor)}
                        />
                        <span className="text-sm">{item.rotulo}</span>
                      </label>
                    ))}
                  </div>

                  {veiculo.restricoes.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="veiculo-restricoes-desc">
                        Descreva a situação marcada
                      </Label>
                      <Textarea
                        id="veiculo-restricoes-desc"
                        rows={3}
                        value={veiculo.restricoesDescricao}
                        onChange={(e) =>
                          setVeiculo({
                            ...veiculo,
                            restricoesDescricao: e.target.value,
                          })
                        }
                        placeholder="Ex.: recuperado de sinistro em 2021, laudo cautelar aprovado."
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="veiculo-obs">Observações do veículo</Label>
                    <Textarea
                      id="veiculo-obs"
                      rows={2}
                      value={veiculo.observacoes}
                      onChange={(e) =>
                        setVeiculo({ ...veiculo, observacoes: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Etapa 3 — Coberturas e benefícios */}
          {etapa === 2 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coberturas</CardTitle>
                  <CardDescription>
                    {coberturasSelecionadas.length} de {coberturas.length} selecionadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2.5 sm:grid-cols-2">
                  {coberturas
                    .filter((c) => c.ativo)
                    .map((c) => (
                      <label
                        key={c.id}
                        className="hover:bg-accent flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={coberturasSelecionadas.includes(c.id)}
                          onCheckedChange={() => alternarCobertura(c.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm">{c.nome}</span>
                          {c.descricao && (
                            <span className="text-muted-foreground block text-xs">
                              {c.descricao}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                </CardContent>
              </Card>

              {beneficiosForm.map((b, indice) => (
                <Card key={b.codigo}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={b.incluido}
                        onCheckedChange={(v) =>
                          atualizarBeneficio(b.codigo, { incluido: v === true })
                        }
                      />
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Benefício {indice + 1}
                        </p>
                        <CardTitle className="text-base">{b.nome}</CardTitle>
                      </div>
                    </div>
                    <div className="w-36">
                      <CampoMoeda
                        valor={b.valor}
                        onChange={(v) => atualizarBeneficio(b.codigo, { valor: v })}
                        disabled={!b.incluido}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor={`beneficio-${b.codigo}`} className="text-xs">
                      Descrição que sai na proposta
                    </Label>
                    <Textarea
                      id={`beneficio-${b.codigo}`}
                      className="mt-1.5 font-mono text-xs"
                      rows={8}
                      value={b.descricao}
                      disabled={!b.incluido}
                      onChange={(e) =>
                        atualizarBeneficio(b.codigo, { descricao: e.target.value })
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Etapa 4 — Valores */}
          {etapa === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valores</CardTitle>
                <CardDescription>
                  Todos os campos continuam editáveis depois de gerar a proposta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoMoeda
                    rotulo="Valor de mercado"
                    valor={veiculo.valorMercado}
                    onChange={(v) => setVeiculo({ ...veiculo, valorMercado: v })}
                    descricao={
                      categoria
                        ? `${categoria.codigo} · ${descreverFaixa(categoria)}`
                        : undefined
                    }
                  />
                  <CampoMoeda
                    rotulo="Valor do rateio"
                    valor={valorRateio}
                    onChange={(v) => {
                      setRateioTocado(true)
                      setValorRateio(v)
                    }}
                    descricao={
                      categoria?.rateio_padrao
                        ? `Sugerido para a faixa: ${formatarMoeda(categoria.rateio_padrao)}`
                        : undefined
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  {beneficiosForm.map((b) => (
                    <div
                      key={b.codigo}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-lg border p-3",
                        !b.incluido && "opacity-50"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.nome}</p>
                        <p className="text-muted-foreground text-xs">
                          {b.incluido ? "Incluído na mensalidade" : "Não incluído"}
                        </p>
                      </div>
                      <div className="w-36 shrink-0">
                        <CampoMoeda
                          valor={b.valor}
                          disabled={!b.incluido}
                          onChange={(v) => atualizarBeneficio(b.codigo, { valor: v })}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoMoeda
                    rotulo="Taxa de adesão"
                    valor={taxaAdesao}
                    onChange={setTaxaAdesao}
                    descricao="Cobrança única, fora da mensalidade."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sim-obs">Observações da proposta</Label>
                  <Textarea
                    id="sim-obs"
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Texto que aparece no fim da proposta."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEtapa((e) => Math.max(0, e - 1))}
              disabled={etapa === 0}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={salvarRascunho}
                disabled={salvando || gerando}
                className="gap-1.5"
              >
                {salvando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar rascunho
              </Button>

              {etapa < ETAPAS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setEtapa((e) => Math.min(ETAPAS.length - 1, e + 1))}
                  className="gap-1.5"
                >
                  Avançar
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={gerarSimulacao}
                  disabled={gerando || salvando}
                  className="gap-1.5"
                >
                  {gerando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileDown className="size-4" />
                  )}
                  {editando ? "Salvar e regerar PDF" : "Gerar Simulação"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Resumo fixo */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-[#0E2A47]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo</CardTitle>
              <CardDescription className="truncate">
                {cliente.nome || "Sem cliente"}
                {veiculo.placa ? ` · ${formatarPlaca(veiculo.placa)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rateio</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(valorRateio)}
                </span>
              </div>

              {beneficiosForm
                .filter((b) => b.incluido)
                .map((b) => (
                  <div
                    key={b.codigo}
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
                  {formatarMoeda(totais.totalMensal)}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de adesão</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(totais.taxaAdesao)}
                </span>
              </div>

              <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
                <span>1º pagamento</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(totais.primeiroPagamento)}
                </span>
              </div>
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>Total no 1º ano</span>
                <span className="font-medium tabular-nums">
                  {formatarMoeda(totais.totalPrimeiroAno)}
                </span>
              </div>

              {problemas.length > 0 && (
                <ul className="text-destructive space-y-1 border-t pt-3 text-xs">
                  {problemas.map((p) => (
                    <li key={p.campo}>• {p.mensagem}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
