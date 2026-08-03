/* eslint-disable jsx-a11y/alt-text */
/**
 * Documento PDF da proposta da ABPAC.
 *
 * Os dados vêm do **snapshot** gravado na simulação, não do cadastro atual:
 * se alguém editar o texto de um benefício amanhã, a proposta já emitida
 * continua idêntica ao papel que o cliente recebeu. As colunas da simulação
 * e as configurações servem só de reserva para linhas antigas, gravadas
 * antes do snapshot existir.
 *
 * Usa as fontes padrão do PDF (Helvetica) de propósito: cobrem os acentos do
 * português e não dependem de baixar arquivo nenhum na hora de gerar.
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
  Cliente,
  Configuracoes,
  Simulacao,
  SnapshotBeneficio,
  SnapshotCobertura,
  Veiculo,
} from "../types"
import { RESTRICOES_VEICULO } from "../types"
import { descreverFaixa } from "../calc"

const CORES = {
  tinta: "#0F1B2A",
  navy: "#0E2A47",
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

  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: CORES.navy,
    paddingBottom: 12,
    marginBottom: 16,
  },
  cabecalhoEsquerda: { flexDirection: "row", alignItems: "center", maxWidth: 380 },
  // A caixa é deitada, não quadrada: logo de associação quase sempre é mais
  // larga do que alta, e com `contain` uma logo quadrada continua cabendo —
  // só não ocupa a largura toda. A área útil da página é 523pt e o selo do
  // número da proposta come ~120, então 112 aqui ainda deixa espaço para o
  // nome e os contatos ao lado.
  logo: { width: 112, height: 68, objectFit: "contain", marginRight: 14 },
  logoVazio: {
    width: 68,
    height: 68,
    marginRight: 14,
    borderRadius: 6,
    backgroundColor: CORES.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  logoVazioTexto: { color: CORES.branco, fontSize: 20, fontFamily: "Helvetica-Bold" },
  nomeEmpresa: { fontSize: 12, fontFamily: "Helvetica-Bold", color: CORES.navy },
  contatoEmpresa: { fontSize: 7.5, color: CORES.cinza, marginTop: 2 },

  selo: { alignItems: "flex-end" },
  seloRotulo: { fontSize: 7, color: CORES.cinza, letterSpacing: 1 },
  seloNumero: { fontSize: 13, fontFamily: "Helvetica-Bold", color: CORES.destaque },
  seloData: { fontSize: 7.5, color: CORES.cinza, marginTop: 2 },

  faixaTitulo: {
    backgroundColor: CORES.navy,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  faixaTituloTexto: { color: CORES.branco, fontSize: 13, fontFamily: "Helvetica-Bold" },
  faixaSubtitulo: { color: "#C7D6E6", fontSize: 9, marginTop: 3 },

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
  beneficioTitulo: { fontSize: 11, fontFamily: "Helvetica-Bold", color: CORES.navy },
  beneficioValor: { fontSize: 13, fontFamily: "Helvetica-Bold", color: CORES.destaque },
  beneficioDescricao: { fontSize: 8.5, color: "#33445A", lineHeight: 1.5 },

  resumo: { backgroundColor: CORES.navy, borderRadius: 6, padding: 14, marginTop: 4 },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  resumoRotulo: { color: "#C7D6E6", fontSize: 9 },
  resumoValor: { color: CORES.branco, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  resumoDivisoria: { borderTopWidth: 1, borderTopColor: "#2F5B87", marginVertical: 6 },
  resumoTotalRotulo: { color: CORES.branco, fontSize: 11, fontFamily: "Helvetica-Bold" },
  resumoTotalValor: { color: "#FFB27A", fontSize: 20, fontFamily: "Helvetica-Bold" },
  resumoObs: { color: "#9FB6CC", fontSize: 7, marginTop: 6 },

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
  cliente: Cliente
  veiculo: Veiculo
  /** Reserva para simulações antigas, gravadas antes do snapshot. */
  configuracoes: Configuracoes
  /** PNG em data URL, resolvido antes da renderização. */
  qrCodeDataUrl?: string | null
  /** Logo já embutida como data URL (evita depender da rede no meio do render). */
  logoDataUrl?: string | null
}

function Campo({
  rotulo,
  valor,
  largo,
}: {
  rotulo: string
  valor: string
  largo?: boolean
}) {
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
  configuracoes,
  qrCodeDataUrl,
  logoDataUrl,
}: DadosProposta) {
  const snap = simulacao.snapshot

  const empresa = {
    nome: snap?.empresa?.nome_associacao ?? configuracoes.nome_associacao,
    cnpj: snap?.empresa?.cnpj ?? configuracoes.cnpj,
    telefone: snap?.empresa?.telefone ?? configuracoes.telefone,
    whatsapp: snap?.empresa?.whatsapp ?? configuracoes.whatsapp,
    email: snap?.empresa?.email ?? configuracoes.email,
    endereco: snap?.empresa?.endereco ?? configuracoes.endereco,
    rodape: snap?.empresa?.rodape_pdf ?? configuracoes.rodape_pdf,
    assinaturaNome: snap?.empresa?.assinatura_nome ?? configuracoes.assinatura_nome,
    assinaturaCargo:
      snap?.empresa?.assinatura_cargo ?? configuracoes.assinatura_cargo,
  }

  const categoria = snap?.categoria ?? null
  const valores = snap?.valores ?? {
    valor_mercado: simulacao.valor_mercado,
    valor_rateio: simulacao.valor_rateio,
    valor_terceiros: simulacao.valor_terceiros,
    valor_assistencia: simulacao.valor_assistencia,
    valor_beneficios_extras: simulacao.valor_beneficios_extras,
    taxa_adesao: simulacao.taxa_adesao,
    total_mensal: simulacao.total_mensal,
  }

  const coberturas: SnapshotCobertura[] = snap?.coberturas ?? []
  const beneficios: SnapshotBeneficio[] = snap?.beneficios ?? []

  const meio = Math.ceil(coberturas.length / 2)
  const colunaEsquerda = coberturas.slice(0, meio)
  const colunaDireita = coberturas.slice(meio)

  const dataSimulacao = new Date(simulacao.created_at)
  const validade = new Date(dataSimulacao)
  validade.setDate(
    validade.getDate() +
      (snap?.validade_dias ?? configuracoes.validade_proposta_dias ?? 30)
  )

  const restricoesMarcadas = (veiculo.restricoes ?? [])
    .map((r) => RESTRICOES_VEICULO.find((item) => item.valor === r)?.rotulo)
    .filter(Boolean) as string[]

  const contato = [
    empresa.telefone && `Tel. ${empresa.telefone}`,
    empresa.whatsapp && `WhatsApp ${empresa.whatsapp}`,
    empresa.email,
  ]
    .filter(Boolean)
    .join("  ·  ")

  const modeloCompleto = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")
  const anos = [veiculo.ano_fabricacao, veiculo.ano_modelo].filter(Boolean).join("/")
  const nomeCliente =
    cliente.tipo_pessoa === "pj" ? cliente.razao_social || cliente.nome : cliente.nome

  return (
    <Document
      title={`Proposta ${simulacao.numero} — ${veiculo.placa}`}
      author={empresa.nome ?? "ABPAC"}
      subject="Simulação de proteção veicular"
      creator={empresa.nome ?? "ABPAC"}
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho} fixed>
          <View style={estilos.cabecalhoEsquerda}>
            {logoDataUrl ? (
              <Image style={estilos.logo} src={logoDataUrl} />
            ) : (
              <View style={estilos.logoVazio}>
                <Text style={estilos.logoVazioTexto}>
                  {(empresa.nome ?? "AB").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={estilos.nomeEmpresa}>{empresa.nome}</Text>
              {!!empresa.cnpj && (
                <Text style={estilos.contatoEmpresa}>CNPJ {empresa.cnpj}</Text>
              )}
              {!!contato && <Text style={estilos.contatoEmpresa}>{contato}</Text>}
            </View>
          </View>

          <View style={estilos.selo}>
            <Text style={estilos.seloRotulo}>PROPOSTA</Text>
            <Text style={estilos.seloNumero}>{simulacao.numero}</Text>
            <Text style={estilos.seloData}>
              {`Emitida em ${dataSimulacao.toLocaleDateString("pt-BR")}`}
            </Text>
            <Text style={estilos.seloData}>
              {`Válida até ${validade.toLocaleDateString("pt-BR")}`}
            </Text>
          </View>
        </View>

        <View style={estilos.faixaTitulo}>
          <Text style={estilos.faixaTituloTexto}>
            {`Sobre a cobertura da placa ${veiculo.placa}`}
          </Text>
          <Text style={estilos.faixaSubtitulo}>
            {`Simulação de proteção veicular preparada para ${nomeCliente}`}
          </Text>
        </View>

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
              style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: CORES.navy }}
            >
              {dinheiro(valores.valor_mercado)}
            </Text>
          </View>

          <View style={estilos.cartaoVeiculoDireita}>
            <Text style={estilos.categoriaEtiqueta}>{categoria?.codigo ?? "—"}</Text>
            <Text style={estilos.categoriaFaixa}>{descreverFaixa(categoria)}</Text>
          </View>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>DADOS DO CLIENTE</Text>
          <View style={estilos.linha}>
            <Campo rotulo="Nome" valor={nomeCliente} largo />
            <Campo rotulo="Telefone" valor={cliente.telefone ?? ""} />
            <Campo
              rotulo="Cidade / UF"
              valor={[cliente.cidade, cliente.uf].filter(Boolean).join(" / ")}
            />
          </View>
        </View>

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

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>BENEFÍCIOS CONTRATADOS</Text>
          {beneficios.map((b, i) => (
            <View key={b.codigo ?? i} style={estilos.beneficio} wrap={false}>
              <View style={estilos.beneficioCabecalho}>
                <View>
                  <Text style={estilos.beneficioRotulo}>{`BENEFÍCIO ${i + 1}`}</Text>
                  <Text style={estilos.beneficioTitulo}>{b.nome}</Text>
                </View>
                <Text style={estilos.beneficioValor}>{dinheiro(b.valor)}</Text>
              </View>
              <Text style={estilos.beneficioDescricao}>{b.descricao}</Text>
            </View>
          ))}
        </View>

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

        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>RESUMO DA PROPOSTA</Text>
          <View style={estilos.resumo}>
            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoRotulo}>Valor do rateio</Text>
              <Text style={estilos.resumoValor}>{dinheiro(valores.valor_rateio)}</Text>
            </View>

            {beneficios.map((b, i) => (
              <View key={`resumo-${b.codigo ?? i}`} style={estilos.resumoLinha}>
                <Text style={estilos.resumoRotulo}>{b.nome}</Text>
                <Text style={estilos.resumoValor}>{dinheiro(b.valor)}</Text>
              </View>
            ))}

            <View style={estilos.resumoDivisoria} />

            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoTotalRotulo}>VALOR MENSAL</Text>
              <Text style={estilos.resumoTotalValor}>
                {dinheiro(valores.total_mensal)}
              </Text>
            </View>

            <View style={estilos.resumoDivisoria} />

            <View style={estilos.resumoLinha}>
              <Text style={estilos.resumoRotulo}>Taxa de adesão (cobrança única)</Text>
              <Text style={estilos.resumoValor}>{dinheiro(valores.taxa_adesao)}</Text>
            </View>

            <Text style={estilos.resumoObs}>
              O valor mensal é a soma do rateio com os benefícios contratados. A
              taxa de adesão é cobrada uma única vez, na contratação, e não compõe
              a mensalidade.
            </Text>
          </View>
        </View>

        {!!simulacao.observacoes && (
          <View style={estilos.secao} wrap={false}>
            <Text style={estilos.secaoTitulo}>OBSERVAÇÕES</Text>
            <Text style={{ fontSize: 8.5, color: "#33445A" }}>
              {simulacao.observacoes}
            </Text>
          </View>
        )}

        <View style={estilos.rodape} fixed>
          <View>
            {!!empresa.rodape && (
              <Text style={estilos.rodapeTexto}>{empresa.rodape}</Text>
            )}
            {!!empresa.endereco && (
              <Text style={estilos.rodapeTexto}>{empresa.endereco}</Text>
            )}
            {!!contato && <Text style={estilos.rodapeTexto}>{contato}</Text>}
            <Text
              style={estilos.paginacao}
              render={({ pageNumber, totalPages }) =>
                `${simulacao.numero}  ·  Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {!!empresa.assinaturaNome && (
              <View style={estilos.assinatura}>
                <View style={estilos.assinaturaLinha} />
                <Text style={estilos.assinaturaNome}>{empresa.assinaturaNome}</Text>
                {!!empresa.assinaturaCargo && (
                  <Text style={estilos.assinaturaCargo}>
                    {empresa.assinaturaCargo}
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
