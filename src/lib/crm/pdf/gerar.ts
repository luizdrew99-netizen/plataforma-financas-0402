/**
 * Geração da proposta em PDF: monta o QR code, renderiza o documento,
 * entrega o arquivo ao consultor e arquiva a versão no Storage.
 *
 * Roda só no navegador — `@react-pdf/renderer` precisa do DOM para o
 * `toBlob()`, e o download depende da própria aba.
 */

import { createElement, type ReactElement } from "react"
import { pdf, type DocumentProps } from "@react-pdf/renderer"
import QRCode from "qrcode"

import { arquivarPdf } from "../queries"
import { formatarPlaca } from "../format"
import { linkPublicoProposta } from "./link"
import { DocumentoProposta, type DadosProposta } from "./documento-proposta"

async function gerarQrCode(conteudo: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(conteudo, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0E2A47", light: "#FFFFFF" },
    })
  } catch (erro) {
    // Um QR ausente não justifica travar a proposta inteira.
    console.error("Não foi possível gerar o QR code:", erro)
    return null
  }
}

export function nomeArquivoProposta(
  numero: number,
  placa: string,
  clienteNome: string
): string {
  const limpo = clienteNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return `proposta-${String(numero).padStart(6, "0")}-${formatarPlaca(
    placa
  ).replace("-", "")}-${limpo || "cliente"}.pdf`
}

/** Renderiza o documento e devolve o PDF como Blob. */
export async function renderizarPropostaBlob(
  dados: Omit<DadosProposta, "qrCodeDataUrl">
): Promise<Blob> {
  const qrCodeDataUrl = await gerarQrCode(
    linkPublicoProposta(dados.simulacao.token_publico)
  )

  // `pdf()` tipa o argumento como elemento de <Document>; o nosso componente
  // devolve exatamente isso, mas o TS só enxerga as props dele.
  const documento = createElement(DocumentoProposta, {
    ...dados,
    qrCodeDataUrl,
  }) as unknown as ReactElement<DocumentProps>

  return pdf(documento).toBlob()
}

export interface ResultadoGeracao {
  blob: Blob
  nomeArquivo: string
  /** `false` quando o PDF foi entregue mas não conseguiu ser arquivado. */
  arquivado: boolean
}

/**
 * Fluxo completo do botão "Gerar Simulação": renderiza, baixa e arquiva.
 * O download vem antes do arquivamento de propósito — se o Storage falhar,
 * o consultor já está com o arquivo na mão.
 */
export async function gerarEBaixarProposta(
  dados: Omit<DadosProposta, "qrCodeDataUrl">,
  opcoes: { baixar?: boolean; arquivar?: boolean } = {}
): Promise<ResultadoGeracao> {
  const { baixar = true, arquivar = true } = opcoes

  const blob = await renderizarPropostaBlob(dados)
  const nomeArquivo = nomeArquivoProposta(
    dados.simulacao.numero,
    dados.veiculo.placa,
    dados.cliente.nome
  )

  if (baixar && typeof window !== "undefined") {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = nomeArquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // Revogar na hora corta o download no Safari; um tick resolve.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  let arquivado = false
  if (arquivar) {
    const registro = await arquivarPdf(
      dados.simulacao.id,
      dados.simulacao.numero,
      blob
    )
    arquivado = registro !== null
  }

  return { blob, nomeArquivo, arquivado }
}

/** Abre a proposta numa aba nova, para conferência antes de enviar. */
export async function visualizarProposta(
  dados: Omit<DadosProposta, "qrCodeDataUrl">
): Promise<void> {
  const blob = await renderizarPropostaBlob(dados)
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
