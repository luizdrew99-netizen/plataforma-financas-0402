"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CampoMoeda } from "@/components/crm/campo-moeda"
import { useCrm } from "@/components/crm/provedor-crm"
import {
  excluirCategoria,
  excluirCobertura,
  salvarBeneficio,
  salvarCategoria,
  salvarCobertura,
  salvarConfiguracoes,
} from "@/lib/crm/queries"
import { descreverFaixa } from "@/lib/crm/calc"
import type { Beneficio, Categoria, Cobertura, Configuracoes } from "@/lib/crm/types"

export default function PaginaConfiguracoes() {
  const { configuracoes, categorias, coberturas, beneficios, ehAdmin, recarregar } =
    useCrm()

  const [empresa, setEmpresa] = useState<Configuracoes | null>(configuracoes)
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>(categorias)
  const [listaCoberturas, setListaCoberturas] = useState<Cobertura[]>(coberturas)
  const [listaBeneficios, setListaBeneficios] = useState<Beneficio[]>(beneficios)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => setEmpresa(configuracoes), [configuracoes])
  useEffect(() => setListaCategorias(categorias), [categorias])
  useEffect(() => setListaCoberturas(coberturas), [coberturas])
  useEffect(() => setListaBeneficios(beneficios), [beneficios])

  async function executar(chave: string, acao: () => Promise<void>, sucesso: string) {
    setSalvando(chave)
    try {
      await acao()
      await recarregar()
      toast.success(sucesso)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSalvando(null)
    }
  }

  if (!empresa) return null

  return (
    <div className="space-y-4">
      {!ehAdmin && (
        <Alert>
          <AlertDescription>
            Você está vendo as configurações em modo leitura. Só um usuário com
            papel <strong>administrador</strong> pode alterá-las.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="coberturas">Coberturas</TabsTrigger>
          <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ Empresa */}
        <TabsContent value="empresa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da empresa</CardTitle>
              <CardDescription>
                Aparecem no cabeçalho e no rodapé de toda proposta gerada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome-empresa">Nome da empresa</Label>
                <Input
                  id="nome-empresa"
                  value={empresa.nome_associacao}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, nome_associacao: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj-empresa">CNPJ</Label>
                <Input
                  id="cnpj-empresa"
                  value={empresa.cnpj ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo-empresa">URL do logotipo</Label>
                <Input
                  id="logo-empresa"
                  value={empresa.logo_url ?? ""}
                  disabled={!ehAdmin}
                  placeholder="https://…/logo.png"
                  onChange={(e) => setEmpresa({ ...empresa, logo_url: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tel-empresa">Telefone</Label>
                <Input
                  id="tel-empresa"
                  value={empresa.telefone ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wpp-empresa">WhatsApp</Label>
                <Input
                  id="wpp-empresa"
                  value={empresa.whatsapp ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, whatsapp: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-empresa">E-mail</Label>
                <Input
                  id="email-empresa"
                  type="email"
                  value={empresa.email ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="site-empresa">Site</Label>
                <Input
                  id="site-empresa"
                  value={empresa.site ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, site: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="end-empresa">Endereço</Label>
                <Input
                  id="end-empresa"
                  value={empresa.endereco ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                />
              </div>

              <Separator className="sm:col-span-2" />

              <CampoMoeda
                rotulo="Taxa de adesão padrão"
                valor={Number(empresa.taxa_adesao_padrao)}
                disabled={!ehAdmin}
                onChange={(v) => setEmpresa({ ...empresa, taxa_adesao_padrao: v })}
                descricao="Sugerida ao abrir uma simulação nova."
              />

              <div className="space-y-1.5">
                <Label htmlFor="validade">Validade da proposta (dias)</Label>
                <Input
                  id="validade"
                  inputMode="numeric"
                  value={String(empresa.validade_proposta_dias)}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({
                      ...empresa,
                      validade_proposta_dias: Number(
                        e.target.value.replace(/\D/g, "") || 0
                      ),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assin-nome">Assinatura — nome</Label>
                <Input
                  id="assin-nome"
                  value={empresa.assinatura_nome ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, assinatura_nome: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assin-cargo">Assinatura — cargo</Label>
                <Input
                  id="assin-cargo"
                  value={empresa.assinatura_cargo ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, assinatura_cargo: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rodape">Rodapé do PDF</Label>
                <Textarea
                  id="rodape"
                  rows={3}
                  value={empresa.rodape_pdf ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, rodape_pdf: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obs-padrao">Observações padrão da proposta</Label>
                <Textarea
                  id="obs-padrao"
                  rows={2}
                  value={empresa.observacoes_padrao ?? ""}
                  disabled={!ehAdmin}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, observacoes_padrao: e.target.value })
                  }
                />
              </div>

              {ehAdmin && (
                <div className="sm:col-span-2">
                  <Button
                    onClick={() =>
                      void executar(
                        "empresa",
                        async () => {
                          const { updated_at, ...campos } = empresa
                          void updated_at
                          await salvarConfiguracoes(campos)
                        },
                        "Configurações salvas."
                      )
                    }
                    disabled={salvando === "empresa"}
                    className="gap-1.5"
                  >
                    {salvando === "empresa" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Categorias */}
        <TabsContent value="categorias" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Faixas de valor</CardTitle>
              <CardDescription>
                A categoria da simulação é escolhida automaticamente pela faixa em
                que o valor de mercado cai. Deixe o teto vazio na última faixa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {listaCategorias.map((cat, indice) => (
                <div
                  key={cat.id}
                  className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[80px_1fr_1fr_1fr_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs">Código</Label>
                    <Input
                      value={cat.codigo}
                      disabled={!ehAdmin}
                      onChange={(e) =>
                        setListaCategorias((l) =>
                          l.map((c, i) =>
                            i === indice ? { ...c, codigo: e.target.value } : c
                          )
                        )
                      }
                    />
                  </div>

                  <CampoMoeda
                    rotulo="De"
                    valor={Number(cat.valor_min)}
                    disabled={!ehAdmin}
                    onChange={(v) =>
                      setListaCategorias((l) =>
                        l.map((c, i) => (i === indice ? { ...c, valor_min: v } : c))
                      )
                    }
                  />

                  <div className="space-y-1.5">
                    <Label className="text-xs">Até (vazio = sem teto)</Label>
                    <Input
                      value={
                        cat.valor_max === null
                          ? ""
                          : Number(cat.valor_max).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })
                      }
                      disabled={!ehAdmin}
                      placeholder="Sem teto"
                      onChange={(e) => {
                        const texto = e.target.value.trim()
                        setListaCategorias((l) =>
                          l.map((c, i) =>
                            i === indice
                              ? {
                                  ...c,
                                  valor_max: texto
                                    ? Number(
                                        texto.replace(/\./g, "").replace(",", ".")
                                      )
                                    : null,
                                }
                              : c
                          )
                        )
                      }}
                    />
                  </div>

                  <CampoMoeda
                    rotulo="Rateio sugerido"
                    valor={Number(cat.rateio_padrao ?? 0)}
                    disabled={!ehAdmin}
                    onChange={(v) =>
                      setListaCategorias((l) =>
                        l.map((c, i) =>
                          i === indice ? { ...c, rateio_padrao: v || null } : c
                        )
                      )
                    }
                  />

                  {ehAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Salvar categoria"
                        onClick={() =>
                          void executar(
                            cat.id,
                            () =>
                              salvarCategoria({
                                id: cat.id,
                                codigo: cat.codigo,
                                nome: `Categoria ${cat.codigo}`,
                                valor_min: cat.valor_min,
                                valor_max: cat.valor_max,
                                rateio_padrao: cat.rateio_padrao,
                              }),
                            "Categoria salva."
                          )
                        }
                        disabled={salvando === cat.id}
                      >
                        {salvando === cat.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Excluir categoria"
                        onClick={() =>
                          void executar(
                            cat.id,
                            () => excluirCategoria(cat.id),
                            "Categoria excluída."
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}

                  <p className="text-muted-foreground col-span-full text-xs">
                    {descreverFaixa(cat)}
                  </p>
                </div>
              ))}

              {ehAdmin && (
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    void executar(
                      "nova-categoria",
                      () =>
                        salvarCategoria({
                          codigo: `R${listaCategorias.length + 1}`,
                          nome: `Categoria R${listaCategorias.length + 1}`,
                          valor_min: 0,
                          valor_max: null,
                          ordem: listaCategorias.length + 1,
                        }),
                      "Categoria criada."
                    )
                  }
                >
                  <Plus className="size-4" />
                  Nova faixa
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Coberturas */}
        <TabsContent value="coberturas" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coberturas</CardTitle>
              <CardDescription>
                As marcadas como padrão já vêm selecionadas na simulação nova.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {listaCoberturas.map((cob, indice) => (
                <div
                  key={cob.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
                >
                  <Input
                    className="min-w-[200px] flex-1"
                    value={cob.nome}
                    disabled={!ehAdmin}
                    onChange={(e) =>
                      setListaCoberturas((l) =>
                        l.map((c, i) =>
                          i === indice ? { ...c, nome: e.target.value } : c
                        )
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cob.padrao}
                      disabled={!ehAdmin}
                      onCheckedChange={(v) =>
                        setListaCoberturas((l) =>
                          l.map((c, i) =>
                            i === indice ? { ...c, padrao: v === true } : c
                          )
                        )
                      }
                    />
                    Padrão
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cob.ativo}
                      disabled={!ehAdmin}
                      onCheckedChange={(v) =>
                        setListaCoberturas((l) =>
                          l.map((c, i) =>
                            i === indice ? { ...c, ativo: v === true } : c
                          )
                        )
                      }
                    />
                    Ativa
                  </label>

                  {ehAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Salvar cobertura"
                        disabled={salvando === cob.id}
                        onClick={() =>
                          void executar(
                            cob.id,
                            () =>
                              salvarCobertura({
                                id: cob.id,
                                nome: cob.nome,
                                padrao: cob.padrao,
                                ativo: cob.ativo,
                              }),
                            "Cobertura salva."
                          )
                        }
                      >
                        {salvando === cob.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Excluir cobertura"
                        onClick={() =>
                          void executar(
                            cob.id,
                            () => excluirCobertura(cob.id),
                            "Cobertura excluída."
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {ehAdmin && (
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    void executar(
                      "nova-cobertura",
                      () =>
                        salvarCobertura({
                          nome: "Nova cobertura",
                          ordem: listaCoberturas.length + 1,
                        }),
                      "Cobertura criada."
                    )
                  }
                >
                  <Plus className="size-4" />
                  Nova cobertura
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Benefícios */}
        <TabsContent value="beneficios" className="mt-4 space-y-4">
          {listaBeneficios.map((ben, indice) => (
            <Card key={ben.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="min-w-0 flex-1 pr-4">
                  <Input
                    value={ben.nome}
                    disabled={!ehAdmin}
                    className="text-base font-semibold"
                    onChange={(e) =>
                      setListaBeneficios((l) =>
                        l.map((b, i) =>
                          i === indice ? { ...b, nome: e.target.value } : b
                        )
                      )
                    }
                  />
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {ben.codigo}
                  </p>
                </div>
                <div className="w-36 shrink-0">
                  <CampoMoeda
                    rotulo="Valor padrão"
                    valor={Number(ben.valor_padrao)}
                    disabled={!ehAdmin}
                    onChange={(v) =>
                      setListaBeneficios((l) =>
                        l.map((b, i) => (i === indice ? { ...b, valor_padrao: v } : b))
                      )
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição impressa na proposta</Label>
                  <Textarea
                    rows={10}
                    className="font-mono text-xs"
                    value={ben.descricao}
                    disabled={!ehAdmin}
                    onChange={(e) =>
                      setListaBeneficios((l) =>
                        l.map((b, i) =>
                          i === indice ? { ...b, descricao: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>

                {ehAdmin && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={ben.padrao}
                        onCheckedChange={(v) =>
                          setListaBeneficios((l) =>
                            l.map((b, i) =>
                              i === indice ? { ...b, padrao: v === true } : b
                            )
                          )
                        }
                      />
                      Vem marcado por padrão
                    </label>
                    <Button
                      className="gap-1.5"
                      disabled={salvando === ben.id}
                      onClick={() =>
                        void executar(
                          ben.id,
                          () =>
                            salvarBeneficio({
                              id: ben.id,
                              nome: ben.nome,
                              descricao: ben.descricao,
                              valor_padrao: ben.valor_padrao,
                              padrao: ben.padrao,
                            }),
                          "Benefício salvo."
                        )
                      }
                    >
                      {salvando === ben.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
