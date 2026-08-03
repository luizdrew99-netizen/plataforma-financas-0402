/**
 * Regras de cálculo da simulação.
 *
 * A conta existe em dois lugares de propósito: a tela precisa do total em
 * tempo real enquanto o consultor digita, e o banco recalcula em
 * `salvar_simulacao` — que é a fonte da verdade gravada em `total_mensal`.
 * Se a fórmula mudar, tem que mudar nos dois.
 */

import type { Categoria } from "./types"

export interface ValoresSimulacao {
  valorRateio: number
  valorTerceiros: number
  valorAssistencia: number
  /** Soma dos benefícios cadastrados além dos dois padrão. */
  valorBeneficiosExtras?: number
  taxaAdesao: number
}

export interface TotaisSimulacao {
  /** Rateio + proteção para terceiros + assistência 24h + extras. */
  totalMensal: number
  /** Cobrança única na adesão, fora da mensalidade. */
  taxaAdesao: number
  /** O que o cliente desembolsa no primeiro mês. */
  primeiroPagamento: number
  /** 12 mensalidades + adesão, para o consultor ter o número anual na mão. */
  totalPrimeiroAno: number
}

const arredondar = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export function calcularTotais(valores: ValoresSimulacao): TotaisSimulacao {
  const totalMensal = arredondar(
    (Number(valores.valorRateio) || 0) +
      (Number(valores.valorTerceiros) || 0) +
      (Number(valores.valorAssistencia) || 0) +
      (Number(valores.valorBeneficiosExtras) || 0)
  )
  const taxaAdesao = arredondar(Number(valores.taxaAdesao) || 0)

  return {
    totalMensal,
    taxaAdesao,
    primeiroPagamento: arredondar(totalMensal + taxaAdesao),
    totalPrimeiroAno: arredondar(totalMensal * 12 + taxaAdesao),
  }
}

/**
 * Espelha o que `salvar_simulacao` faz no banco: faixa exata; se o valor cair
 * num vão entre faixas, a mais próxima por baixo; em último caso, a primeira.
 * Nunca devolve vazio havendo ao menos uma categoria ativa.
 */
export function resolverCategoria(
  valorMercado: number,
  categorias: Categoria[]
): Categoria | null {
  const ativas = categorias
    .filter((c) => c.ativo)
    .sort((a, b) => a.ordem - b.ordem)
  if (ativas.length === 0) return null

  const valor = Number(valorMercado) || 0

  const exata = ativas.find(
    (c) =>
      valor >= Number(c.valor_min) &&
      (c.valor_max === null || valor <= Number(c.valor_max))
  )
  if (exata) return exata

  const abaixo = [...ativas]
    .filter((c) => Number(c.valor_min) <= valor)
    .sort((a, b) => Number(b.valor_min) - Number(a.valor_min))[0]

  return abaixo ?? ativas[0]
}

/** "De R$ 250.000,01 até R$ 350.000,00" / "Acima de R$ 350.000,00". */
export function descreverFaixa(
  categoria:
    | { valor_min: number | null; valor_max: number | null }
    | null
    | undefined
): string {
  if (!categoria || categoria.valor_min === null) return "—"
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    })

  const min = Number(categoria.valor_min)
  if (categoria.valor_max === null || categoria.valor_max === undefined) {
    return `Acima de ${fmt(min)}`
  }
  if (min <= 0.01) return `Até ${fmt(Number(categoria.valor_max))}`
  return `De ${fmt(min)} até ${fmt(Number(categoria.valor_max))}`
}

export interface ProblemaValidacao {
  campo: string
  mensagem: string
}

/** Checagens que impedem gerar uma proposta incoerente. */
export function validarSimulacao(dados: {
  clienteNome?: string | null
  placa?: string | null
  valorMercado?: number | null
  valorRateio?: number | null
}): ProblemaValidacao[] {
  const problemas: ProblemaValidacao[] = []

  if (!dados.clienteNome?.trim()) {
    problemas.push({ campo: "clienteNome", mensagem: "Informe o nome do cliente." })
  }
  if (!dados.placa?.trim()) {
    problemas.push({ campo: "placa", mensagem: "Informe a placa do veículo." })
  }
  if (!dados.valorMercado || dados.valorMercado <= 0) {
    problemas.push({
      campo: "valorMercado",
      mensagem: "O valor de mercado precisa ser maior que zero.",
    })
  }
  if (!dados.valorRateio || dados.valorRateio <= 0) {
    problemas.push({
      campo: "valorRateio",
      mensagem: "O valor do rateio precisa ser maior que zero.",
    })
  }

  return problemas
}
