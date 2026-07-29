// Formatação pt-BR centralizada. Antes cada componente montava a string na mão
// (`R$ ${valor}`), o que produzia "R$ 1200" em uma tela e "R$ 1.200,00" em outra.

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value ?? 0)
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value ?? 0)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")}%`
}

/** Converte "2026-03-15" em Date local, sem o deslocamento de fuso do UTC. */
export function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function formatDate(date: string): string {
  return parseISODate(date).toLocaleDateString("pt-BR")
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

/** Data de hoje em YYYY-MM-DD no fuso local. */
export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Dias restantes até a data (negativo quando já passou). */
export function daysUntil(date: string): number {
  const target = parseISODate(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}
