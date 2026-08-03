"use client"

/**
 * Cadastro definitivo do cliente: é aqui que a ficha enxuta criada na
 * simulação vira um cadastro completo de pessoa física ou jurídica.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, Loader2, Save, Truck, User } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EtiquetaCategoria, EtiquetaStatus } from "@/components/crm/etiquetas"
import { GestorDocumentos } from "@/components/crm/gestor-documentos"
import { listarSimulacoes, obterCliente, salvarCliente } from "@/lib/crm/queries"
import {
  formatarData,
  formatarMoeda,
  formatarNumeroSimulacao,
  formatarPlaca,
} from "@/lib/crm/format"
import { ESTADOS_BR, type Cliente, type SimulacaoDetalhe, type TipoPessoa } from "@/lib/crm/types"

function Campo({
  id,
  rotulo,
  valor,
  onChange,
  placeholder,
  tipo = "text",
  className,
}: {
  id: string
  rotulo: string
  valor: string
  onChange: (v: string) => void
  placeholder?: string
  tipo?: string
  className?: string
}) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function PaginaClienteDetalhe() {
  const { id } = useParams<{ id: string }>()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [simulacoes, setSimulacoes] = useState<SimulacaoDetalhe[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const dados = await obterCliente(id)
      setCliente(dados)
      setSimulacoes(await listarSimulacoes({ clienteId: id, limite: 200 }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  function atualizar(patch: Partial<Cliente>) {
    setCliente((c) => (c ? { ...c, ...patch } : c))
  }

  async function salvar() {
    if (!cliente) return
    setSalvando(true)
    try {
      await salvarCliente(cliente)
      toast.success("Cadastro salvo.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente não encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/crm/clientes">Voltar</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const endereco = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Campo
        id="cep"
        rotulo="CEP"
        valor={cliente.cep ?? ""}
        onChange={(v) => atualizar({ cep: v })}
        placeholder="00000-000"
      />
      <Campo
        id="endereco"
        rotulo="Endereço"
        valor={cliente.endereco ?? ""}
        onChange={(v) => atualizar({ endereco: v })}
        className="space-y-1.5 lg:col-span-2"
      />
      <Campo
        id="numero"
        rotulo="Número"
        valor={cliente.numero ?? ""}
        onChange={(v) => atualizar({ numero: v })}
      />
      <Campo
        id="complemento"
        rotulo="Complemento"
        valor={cliente.complemento ?? ""}
        onChange={(v) => atualizar({ complemento: v })}
      />
      <Campo
        id="bairro"
        rotulo="Bairro"
        valor={cliente.bairro ?? ""}
        onChange={(v) => atualizar({ bairro: v })}
      />
      <Campo
        id="cidade"
        rotulo="Cidade"
        valor={cliente.cidade ?? ""}
        onChange={(v) => atualizar({ cidade: v })}
      />
      <div className="space-y-1.5">
        <Label htmlFor="estado">Estado</Label>
        <Select
          value={cliente.uf ?? undefined}
          onValueChange={(v) => atualizar({ uf: v })}
        >
          <SelectTrigger id="estado" className="w-full">
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
    </div>
  )

  const contato = (
    <div className="grid gap-4 sm:grid-cols-3">
      <Campo
        id="telefone"
        rotulo="Telefone"
        valor={cliente.telefone ?? ""}
        onChange={(v) => atualizar({ telefone: v })}
        placeholder="(00) 0000-0000"
      />
      <Campo
        id="whatsapp"
        rotulo="WhatsApp"
        valor={cliente.whatsapp ?? ""}
        onChange={(v) => atualizar({ whatsapp: v })}
        placeholder="(00) 00000-0000"
      />
      <Campo
        id="email"
        rotulo="E-mail"
        tipo="email"
        valor={cliente.email ?? ""}
        onChange={(v) => atualizar({ email: v })}
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/crm/clientes" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{cliente.nome}</h2>
            <p className="text-muted-foreground text-sm">
              Cliente desde {formatarData(cliente.created_at)}
            </p>
          </div>
        </div>

        <Button onClick={() => void salvar()} disabled={salvando} className="gap-1.5">
          {salvando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar cadastro
        </Button>
      </div>

      <Tabs
        value={cliente.tipo_pessoa}
        onValueChange={(v) => atualizar({ tipo_pessoa: v as TipoPessoa })}
      >
        <TabsList>
          <TabsTrigger value="pf" className="gap-1.5">
            <User className="size-4" />
            Pessoa Física
          </TabsTrigger>
          <TabsTrigger value="pj" className="gap-1.5">
            <Building2 className="size-4" />
            Pessoa Jurídica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pf" className="mt-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo
                  id="nome"
                  rotulo="Nome completo"
                  valor={cliente.nome}
                  onChange={(v) => atualizar({ nome: v })}
                  className="space-y-1.5 lg:col-span-2"
                />
                <Campo
                  id="cpf"
                  rotulo="CPF"
                  valor={cliente.cpf ?? ""}
                  onChange={(v) => atualizar({ cpf: v })}
                  placeholder="000.000.000-00"
                />
                <Campo
                  id="rg"
                  rotulo="RG"
                  valor={cliente.rg ?? ""}
                  onChange={(v) => atualizar({ rg: v })}
                />
                <Campo
                  id="cnh"
                  rotulo="CNH"
                  valor={cliente.cnh ?? ""}
                  onChange={(v) => atualizar({ cnh: v })}
                />
                <Campo
                  id="nascimento"
                  rotulo="Data de nascimento"
                  tipo="date"
                  valor={cliente.data_nascimento ?? ""}
                  onChange={(v) => atualizar({ data_nascimento: v || null })}
                />
              </div>
              {contato}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent>{endereco}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pj" className="mt-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo
                  id="razao"
                  rotulo="Razão social"
                  valor={cliente.razao_social ?? ""}
                  onChange={(v) => atualizar({ razao_social: v, nome: v || cliente.nome })}
                  className="space-y-1.5 lg:col-span-2"
                />
                <Campo
                  id="fantasia"
                  rotulo="Nome fantasia"
                  valor={cliente.nome_fantasia ?? ""}
                  onChange={(v) => atualizar({ nome_fantasia: v })}
                />
                <Campo
                  id="cnpj"
                  rotulo="CNPJ"
                  valor={cliente.cnpj ?? ""}
                  onChange={(v) => atualizar({ cnpj: v })}
                  placeholder="00.000.000/0000-00"
                />
                <Campo
                  id="ie"
                  rotulo="Inscrição estadual"
                  valor={cliente.inscricao_estadual ?? ""}
                  onChange={(v) => atualizar({ inscricao_estadual: v })}
                />
                <Campo
                  id="responsavel"
                  rotulo="Responsável"
                  valor={cliente.responsavel ?? ""}
                  onChange={(v) => atualizar({ responsavel: v })}
                />
                <Campo
                  id="cpf-resp"
                  rotulo="CPF do responsável"
                  valor={cliente.cpf_responsavel ?? ""}
                  onChange={(v) => atualizar({ cpf_responsavel: v })}
                  placeholder="000.000.000-00"
                />
              </div>
              {contato}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent>{endereco}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={cliente.observacoes ?? ""}
            onChange={(e) => atualizar({ observacoes: e.target.value })}
            placeholder="Anotações internas sobre o cliente"
          />
        </CardContent>
      </Card>

      <GestorDocumentos clienteId={cliente.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulações deste cliente</CardTitle>
          <CardDescription>{simulacoes.length} no total</CardDescription>
        </CardHeader>
        <CardContent>
          {simulacoes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma simulação registrada.
            </p>
          ) : (
            <ul className="divide-y">
              {simulacoes.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Truck className="text-muted-foreground size-4 shrink-0" />
                  <Link
                    href={`/crm/simulacoes/${s.id}`}
                    className="min-w-0 flex-1 hover:underline"
                  >
                    <span className="block truncate text-sm font-medium">
                      {formatarNumeroSimulacao(s.numero)} ·{" "}
                      {formatarPlaca(s.veiculo_placa)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {formatarData(s.created_at)} ·{" "}
                      {formatarMoeda(s.total_mensal)}/mês
                    </span>
                  </Link>
                  <EtiquetaCategoria codigo={s.categoria_codigo} />
                  <EtiquetaStatus status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
