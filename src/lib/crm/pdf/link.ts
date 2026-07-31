/**
 * Módulo leve, separado de `gerar.ts` de propósito: várias telas só precisam
 * montar o link público (compartilhar, copiar, QR), e importar o gerador
 * arrastaria o `@react-pdf/renderer` inteiro para o bundle inicial delas.
 */

/** Link público da proposta — o mesmo endereço que vai dentro do QR code. */
export function linkPublicoProposta(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/proposta/${token}`
}
