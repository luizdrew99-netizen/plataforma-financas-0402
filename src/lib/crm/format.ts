/** Formatação e máscaras pt-BR usadas em todo o CRM. */

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const NUMERO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatarMoeda(valor: number | null | undefined): string {
  return MOEDA.format(Number(valor ?? 0))
}

/** Sem o símbolo — para tabelas densas e para dentro do PDF. */
export function formatarNumero(valor: number | null | undefined): string {
  return NUMERO.format(Number(valor ?? 0))
}

/** "R$ 1,2 mi" / "R$ 340 mil" — para cartões de indicador. */
export function formatarMoedaCompacta(valor: number | null | undefined): string {
  const n = Number(valor ?? 0)
  if (Math.abs(n) >= 1_000_000) {
    return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`
  }
  if (Math.abs(n) >= 10_000) {
    return `R$ ${(n / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })} mil`
  }
  return formatarMoeda(n)
}

/**
 * Lê o que o usuário digitou num campo de dinheiro.
 * Trata os dois jeitos que aparecem na prática: "275.000,00" (pt-BR) e
 * "275000.00" (colado de planilha).
 */
export function moedaParaNumero(texto: string | number | null | undefined): number {
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : 0
  if (!texto) return 0

  const limpo = String(texto).replace(/[^\d,.-]/g, "")
  if (!limpo) return 0

  const temVirgula = limpo.includes(",")
  const temPonto = limpo.includes(".")

  let normalizado = limpo
  if (temVirgula && temPonto) {
    // O último separador que aparece é o decimal.
    normalizado =
      limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "")
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".")
  } else if (temPonto) {
    // "275.000" é milhar, "275.00" é decimal — decide pelo tamanho do grupo final.
    const partes = limpo.split(".")
    const ultima = partes[partes.length - 1]
    normalizado = ultima.length === 3 ? partes.join("") : limpo
  }

  const valor = Number.parseFloat(normalizado)
  return Number.isFinite(valor) ? valor : 0
}

/** Valor numérico -> texto para o `value` de um input de dinheiro. */
export function numeroParaCampoMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return ""
  return NUMERO.format(valor)
}

/** Aceita Mercosul (ABC1D23) e o padrão antigo (ABC-1234). */
export function formatarPlaca(placa: string | null | undefined): string {
  const limpa = String(placa ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  if (limpa.length !== 7) return limpa
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa)
  return mercosul ? limpa : `${limpa.slice(0, 3)}-${limpa.slice(3)}`
}

export function placaValida(placa: string | null | undefined): boolean {
  const limpa = String(placa ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa) || /^[A-Z]{3}\d{4}$/.test(limpa)
}

export function formatarTelefone(telefone: string | null | undefined): string {
  const d = String(telefone ?? "").replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return String(telefone ?? "")
}

export function formatarCpf(cpf: string | null | undefined): string {
  const d = String(cpf ?? "").replace(/\D/g, "")
  if (d.length !== 11) return String(cpf ?? "")
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  const d = String(cnpj ?? "").replace(/\D/g, "")
  if (d.length !== 14) return String(cnpj ?? "")
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
    8,
    12
  )}-${d.slice(12)}`
}

export function formatarCep(cep: string | null | undefined): string {
  const d = String(cep ?? "").replace(/\D/g, "")
  if (d.length !== 8) return String(cep ?? "")
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function somenteDigitos(texto: string | null | undefined): string {
  return String(texto ?? "").replace(/\D/g, "")
}

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return "—"
  const d = typeof data === "string" ? new Date(data) : data
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR")
}

export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return "—"
  const d = typeof data === "string" ? new Date(data) : data
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** "2026-07" -> "jul/26", para o eixo do gráfico. */
export function formatarMesCurto(mes: string): string {
  const [ano, m] = mes.split("-")
  const nomes = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ]
  const indice = Number(m) - 1
  if (!nomes[indice]) return mes
  return `${nomes[indice]}/${ano.slice(2)}`
}

/**
 * O número já vem pronto do banco ("SIM-2026-000001", "CTR-2026-000001").
 * Esta função existe só para dar um lugar único caso o formato mude.
 */
export function formatarNumeroSimulacao(numero: string | null | undefined): string {
  return numero ?? "—"
}

export function iniciais(nome: string | null | undefined): string {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
