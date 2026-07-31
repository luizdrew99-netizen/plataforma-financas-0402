/* eslint-disable jsx-a11y/alt-text */
/**
 * Documento PDF da proposta de proteção veicular.
 *
 * Usa as fontes padrão do PDF (Helvetica) de propósito: elas já cobrem os
 * acentos do português e não dependem de baixar arquivo nenhum na hora de
 * gerar, o que manteria a geração presa à rede.
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

import type {
  BeneficioSnapshot,
  Categoria,
  Cliente,
  CoberturaSnapshot,
  Configuracoes,
  Simulacao,
  Veiculo,
} from "../types"
import { RESTRICOES_VEICULO } from "../types"
import { descreverFaixa } from "../calc"

const CORES = {
  tinta: "#0F1B2A",
  navy: "#0E2A47",
  navyClaro: "#1B4670",
  destaque: "#C2410C",
  cinza: "#5B6B7F",
  cinzaClaro: "#E3E8EF",
  fundoSuave: "#F5F7FA",
  branco: "#FFFFFF",
}

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 28,
    paddingBottom: 64,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: CORES.tinta,
    lineHeight: 1.45,
  },

  // Cabeçalho
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: CORES.navy,
    paddingBottom: 12,
    marginBottom: 16,
  },
  cabecalhoEsquerda: { flexDirection: "row", alignItems: "center", maxWidth: 320 },
  logo: { width: 54, height: 54, objectFit: "contain", marginRight: 12 },
  logoVazio: {
    width: 54,
    height: 54,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: CORES.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  logoVazioTexto: { color: CORES.branco, fontSize: 18, fontFamily: "Helvetica-Bold" },
  nomeEmpresa: { fontSize: 14, fontFamily: "Helvetica-Bold", color: CORES.navy },
  contatoEmpresa: { fontSize: 7.5, color: CORES.cinza, marginTop: 2 },

  selo: {
    alignItems: "flex-end",
  },
  seloRotulo: { fontSize: 7, color: CORES.cinza, letterSpacing: 1 },
  seloNumero: { fontSize: 16, fontFamily: "Helvetica-Bold", color: CORES.destaque },
  seloData: { fontSize: 7.5, color: CORES.cinza, marginTop: 2 },

  // Faixa do título
  faixaTitulo: {
    backgroundColor: CORES.navy,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  faixaTituloTexto: {
    color: CORES.branco,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  faixaSubtitulo: { color: "#C7D6E6", fontSize: 9, marginTop: 3 },

  // Seções
  secao: { marginBottom: 14 },
  secaoTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CORES.navy,
    letterSpacing: 1.2,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: CORES.cinzaClaro,
  },

  linha: { flexDirection: "row", flexWrap: "wrap" },
  campo: { width: "25%", marginBottom: 7, paddingRight: 8 },
  campoLargo: { width: "50%", marginBottom: 7, paddingRight: 8 },
  campoRotulo: { fontSize: 7, color: CORES.cinza, letterSpacing: 0.4 },
  campoValor: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 1 },

  // Destaque do veículo
  cartaoVeiculo: {
    flexDirection: "row",
    backgroundColor: CORES.fundoSuave,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: CORES.destaque,
    padding: 12,
    marginBottom: 14,
  },
  cartaoVeiculoBloco: { flex: 1 },
  cartaoVeiculoPlaca: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: CORES.navy,
    letterSpacing: 1,
  },
  cartaoVeiculoModelo: { fontSize: 10, marginTop: 2 },
  cartaoVeiculoDireita: { alignItems: "flex-end", justifyContent: "center" },
  categoriaEtiqueta: {
    backgroundColor: CORES.navy,
    color: CORES.branco,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  categoriaFaixa: { fontSize: 7.5, color: CORES.cinza, marginTop: 3 },

  // Coberturas
  coberturasColunas: { flexDirection: "row" },
  coberturasColuna: { width: "50%", paddingRight: 10 },
  itemCobertura: { flexDirection: "row", marginBottom: 3.5 },
  marcador: {
    color: CORES.destaque,
    fontFamily: "Helvetica-Bold",
    marginRight: 5,
    fontSize: 9,
  },
  itemCoberturaTexto: { flex: 1, fontSize: 9 },

  // Benefícios
  beneficio: {
    borderWidth: 1,
    borderColor: CORES.cinzaClaro,
    borderRadius: 6,
    padding: 11,
    marginBottom: 9,
  },
  beneficioCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  beneficioRotulo: { fontSize: 7, color: CORES.cinza, letterSpacing: 0.8 },
  beneficioTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: CORES.navy,
  },
  beneficioValor: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: CORES.destaque,
  },
  beneficioDescricao: { fontSize: 8.5, color: "#33445A", lineHeight: 1.5 },

  // Resumo financeiro
  resumo: {
    backgroundColor: CORES.navy,
    borderRadius: 6,
    padding: 14,
    marginTop: 4,
  },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  resumoRotulo: { color: "#C7D6E6", fontSize: 9 },
  resumoValor: { color: CORES.branco, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  resumoDivisoria: {
    borderTopWidth: 1,
    borderTopColor: "#2F5B87",
    marginVertical: 6,
  },
  resumoTotalRotulo: {
    color: CORES.branco,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  resumoTotalValor: {
    color: "#FFB27A",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  resumoObs: { color: "#9FB6CC", fontSize: 7, marginTop: 6 },

  // Observações e alertas
  caixaObservacao: {
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderRadius: 4,
    padding: 9,
    marginBottom: 10,
  },
  caixaObservacaoTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400E",
    marginBottom: 3,
  },
  caixaObservacaoTexto: { fontSize: 8.5, color: "#7C2D12" },

  // Rodapé
  rodape: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: CORES.cinzaClaro,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  rodapeTexto: { fontSize: 6.8, color: CORES.cinza, maxWidth: 340, lineHeight: 1.4 },
  rodapeDireita: { alignItems: "center" },
  qrCode: { width: 46, height: 46 },
  qrLegenda: { fontSize: 5.5, color: CORES.cinza, marginTop: 2 },
  assinatura: { alignItems: "center", marginRight: 14 },
  assinaturaLinha: {
    borderTopWidth: 1,
    borderTopColor: CORES.cinza,
    width: 120,
    marginBottom: 2,
  },
  assinaturaNome: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  assinaturaCargo: { fontSize: 6.2, color: CORES.cinza },
  paginacao: { fontSize: 6.5, color: CORES.cinza, marginTop: 3 },
})

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})
const dinheiro = (v: number | null | undefined) => MOEDA.format(Number(v ?? 0))

export interface DadosProposta {
  simulacao: Simulacao
  cliente: Pick<
    Cliente,
    "nome" | "telefone" | "whatsapp" | "email" | "cidade" | "estado" | "observacoes"
  >
  veiculo: Pick<
    Veiculo,
    | "placa"
    | "marca"
    | "modelo"
    | "ano_modelo"
    | "ano_fabricacao"
    | "restricoes"
    | "restricoes_descricao"
    | "observacoes"
  >
  categoria: Pick<Categoria, "codigo" | "nome" | "valor_min" | "valor_max"> | null
  configuracoes: Configuracoes
  /** PNG em data URL, gerado antes da renderização. */
  qrCodeDataUrl?: string | null
}

function Campo({ rotulo, valor, largo }: { rotulo: string; valor: string; largo?: boolean }) {
  return (
    <View style={largo ? estilos.campoLargo : estilos.campo}>
      <Text style={estilos.campoRotulo}>{rotulo.toUpperCase()}</Text>
      <Text style={estilos.campoValor}>{valor || "—"}</Text>
    </View>
  )
}

export function DocumentoProposta({
  simulacao,
  cliente,
  veiculo,
  categoria,
  configuracoes,
  qrCodeDataUrl,
}: DadosProposta) {
  const coberturas = (simulacao.coberturas_snapshot ?? []) as CoberturaSnapshot[]
  const beneficios = (simulacao.beneficios_snapshot ?? []) as BeneficioSnapshot[]

  const meio = Math.ceil(coberturas.length / 2)
  const colunaEsquerda = coberturas.slice(0, meio)
  const colunaDireita = coberturas.slice(meio)

  const dataSimulacao = new Date(simulacao.created_at)
  const validade = new Date(dataSimulacao)
  validade.setDate(validade.getDate() + (configuracoes.validade_proposta_dias ?? 7))

  const restricoesMarcadas = (veiculo.restricoes ?? [])
    .map((r) => RESTRICOES_VEICULO.find((item) => item.valor === r)?.rotulo)
    .filter(Boolean) as string[]

  const contato = [
    configuracoes.telefone && `Tel. ${configuracoes.telefone}`,
    configuracoes.whatsapp && `WhatsApp ${configuracoes.whatsapp}`,
    configuracoes.email,
  ]
    .filter(Boolean)
    .join("  ·  ")

  const modeloCompleto = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")
  const anos = [veiculo.ano_fabricacao, veiculo.ano_modelo].filter(Boolean).join("/")

  return (
    <Document
      title={`Proposta ${simulacao.numero} — ${veiculo.placa}`}
      author={configuracoes.nome_empresa}
      subject="Simulação de proteção veicular"
      creator={configuracoes.nome_empresa}
    >
      <Page size="A4" style={estilos.pagina}>
        {/* Cabeçalho */}
        <View style={estilos.cabecalho} fixed>
          <View style={estilos.cabecalhoEsquerda}>
            {configuracoes.logo_url ? (
              <Image style={estilos.logo} src={configuracoes.logo_url} />
            ) : (
              <View style={estilos.logoVazio}>
                <Text style={estilos.logoVazioTexto}>
                  {configuracoes.nome_empresa.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={estilos.nomeEmpresa}>{configuracoes.nome_empresa}</Text>
              {!!configuracoes.cnpj && (
                <Text style={estilos.contatoEmpresa}>CNPJ {configuracoes.cnpj}</Text>
              )}
              {!!contato && <Text style={estilos.contatoEmpresa}>{contato}</Text>}
            </View>
          </View>

          <View style={estilos.selo}>
            <Text style={estilos.seloRotulo}>PROPOSTA Nº</Text>
            <Text style={estilos.seloNumero}>
              {`#${String(simulacao.numero).padStart(6, "0")}`}
            </Text>
            <Text style={estilos.seloData}>
              {`Emitida em ${dataSimulacao.toLocaleDateString("pt-BR")}`}
            </Text>
            <Text style={estilos.seloData}>
              {`Válida até ${validade.toLocaleDateString("pt-BR")}`}
            </Text>
          </View>
        </View>

        {/* Título */}
        <View style={estilos.faixaTitulo}>
          <Text style={estilos.faixaTituloTexto}>
            {`Sobre a cobertura da placa ${veiculo.placa}`}
          </Text>
          <Text style={estilos.faixaSubtitulo}>
            {`Simulação de proteção veicular preparada para ${cliente.nome}`}
          </Text>
        </View>

        {/* Veículo em destaque */}
        <View style={estilos.cartaoVeiculo}>
          <View style={estilos.cartaoVeiculoBloco}>
            <Text style={estilos.cartaoVeiculoPlaca}>{veiculo.placa}</Text>
            <Text style={estilos.cartaoVeiculoModelo}>
              {modeloCompleto || "Veículo"}
              {anos ? `  ·  ${anos}` : ""}
            </Text>
            <Text style={{ fontSize: 8.5, color: CORES.cinza, marginTop: 4 }}>
              Valor de mercado
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Helvetica-Bold",
                color: CORES.navy,
              }}
            >
              {dinheiro(simulacao.valor_mercado)}
            </Text>
          </View>

          <View style={estilos.cartaoVeiculoDireita}>
            <Text style={estilos.categoriaEtiqueta}>
              {categoria?.codigo ?? "—"}
            </Text>
            <Text style={estilos.categoriaFaixa}>{descreverFaixa(categoria)}</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>DADOS DO CLIENTE</Text>
          <View style={estilos.linha}>
            <Campo rotulo="Nome" valor={cliente.nome} largo />
            <Campo rotulo="Telefone" valor={cliente.telefone ?? ""} />
            <Campo
              rotulo="Cidade / UF"
              valor={[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}
            />
          </View>
        </View>

        {/* Coberturas */}
        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>COBERTURAS INCLUÍDAS</Text>
          <View style={estilos.coberturasColunas}>
            <View style={estilos.coberturasColuna}>
              {colunaEsquerda.map((c, i) => (
                <View key={`ce-${i}`} style={estilos.itemCobertura}>
                  <Text style={estilos.marcador}>•</Text>
                  <Text style={estilos.itemCoberturaTexto}>{c.nome}</Text>
                </View>
              ))}
            </View>
            <View style={estilos.coberturasColuna}>
              {colunaDireita.map((c, i) => (
                <View key={`cd-${i}`} style={estilos.itemCobertura}>
                  <Text style={estilos.marcador}>•</Text>
                  <Text style={estilos.itemCoberturaTexto}>{c.nome}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Benefícios */}
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>BENEFÍCIOS CONTRATADOS</Text>
          {beneficios.map((b, i) => (
            <View key={b.chave ?? i} style={estilos.beneficio} wrap={false}>
              <View style={estilos.beneficioCabecalho}>
                <View>
                  <Text style={estilos.beneficioRotulo}>
                    {`BENEFÍCIO ${i + 1}`}
                  </Text>
                  <Text style={estilos.beneficioTitulo}>{b.titulo}</Text>
                </View>
                <Text style={estilos.beneficioValor}>{dinheiro(b.valor)}</Text>
              </View>
              <Text style={estilos.beneficioDescricao}>{b.descricao}</Text>
            </View>
          ))}
        </View>

        {/* Restrições declaradas — precisa aparecer, muda a análise de risco */}
        {(restricoesMarcadas.length > 0 || !!veiculo.restricoes_descricao) && (
          <View style={estilos.caixaObservacao} wrap={false}>
            <Text style={estilos.caixaObservacaoTitulo}>
              OBSERVAÇÕES SOBRE O VEÍCULO
            </Text>
            {restricoesMarcadas.length > 0 && (
              <Text style={estilos.caixaObservacaoTexto}>
                {restricoesMarcadas.join("  ·  ")}
              </Text>
            )}
            {!!veiculo.restricoes_descricao && (
              <Text style={estilos.caixaObservacaoTexto}>
                {veiculo.restricoes_descricao}
              </Text>
            )}
          </View>
        )}

        {/* Resumo */}
        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>RESUMO DA PROPOSTA</Text>
          <View style={estilos.resumo}>
            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoRotulo}>Valor do rateio</Text>
              <Text style={estilos.resumoValor}>
                {dinheiro(simulacao.valor_rateio)}
              </Text>
            </View>
            {/* Uma linha por benefício vendido, na mesma ordem da seção acima */}
            {beneficios.map((b, i) => (
              <View key={`resumo-${b.chave ?? i}`} style={estilos.resumoLinha}>
                <Text style={estilos.resumoRotulo}>{b.titulo}</Text>
                <Text style={estilos.resumoValor}>{dinheiro(b.valor)}</Text>
              </View>
            ))}

            <View style={estilos.resumoDivisoria} />

            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoTotalRotulo}>VALOR MENSAL</Text>
              <Text style={estilos.resumoTotalValor}>
                {dinheiro(simulacao.valor_mensal)}
              </Text>
            </View>

            <View style={estilos.resumoDivisoria} />

            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoRotulo}>
                Taxa de adesão (cobrança única)
              </Text>
              <Text style={estilos.resumoValor}>
                {dinheiro(simulacao.taxa_adesao)}
              </Text>
            </View>

            <Text style={estilos.resumoObs}>
              O valor mensal é a soma do rateio com os benefícios contratados. A
              taxa de adesão é cobrada uma única vez, na contratação, e não compõe
              a mensalidade.
            </Text>
          </View>
        </View>

        {/* Observações da simulação */}
        {!!simulacao.observacoes && (
          <View style={estilos.secao} wrap={false}>
            <Text style={estilos.secaoTitulo}>OBSERVAÇÕES</Text>
            <Text style={{ fontSize: 8.5, color: "#33445A" }}>
              {simulacao.observacoes}
            </Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={estilos.rodape} fixed>
          <View>
            <Text style={estilos.rodapeTexto}>{configuracoes.rodape_pdf}</Text>
            {!!configuracoes.endereco && (
              <Text style={estilos.rodapeTexto}>{configuracoes.endereco}</Text>
            )}
            {!!contato && <Text style={estilos.rodapeTexto}>{contato}</Text>}
            <Text
              style={estilos.paginacao}
              render={({ pageNumber, totalPages }) =>
                `Proposta #${String(simulacao.numero).padStart(6, "0")}  ·  ` +
                `Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {!!configuracoes.assinatura_nome && (
              <View style={estilos.assinatura}>
                <View style={estilos.assinaturaLinha} />
                <Text style={estilos.assinaturaNome}>
                  {configuracoes.assinatura_nome}
                </Text>
                {!!configuracoes.assinatura_cargo && (
                  <Text style={estilos.assinaturaCargo}>
                    {configuracoes.assinatura_cargo}
                  </Text>
                )}
              </View>
            )}

            {!!qrCodeDataUrl && (
              <View style={estilos.rodapeDireita}>
                <Image style={estilos.qrCode} src={qrCodeDataUrl} />
                <Text style={estilos.qrLegenda}>Consultar proposta</Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
