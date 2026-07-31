/**
 * Regras de cálculo da simulação.
 *
 * O banco também calcula `valor_mensal` (coluna gerada), mas a tela precisa
 * do total em tempo real enquanto o consultor digita. As duas contas são a
 * mesma fórmula de propósito — se uma mudar, a outra tem que mudar junto.
 */

import type { Categoria } from "./types"

export interface ValoresSimulacao {
  valorRateio: number
  valorProtecaoTerceiros: number
  valorAssistencia: number
  /** Soma dos benefícios extras cadastrados pelo admin. */
  valorBeneficiosExtras?: number
  taxaAdesao: number
}

export interface TotaisSimulacao {
  /** Rateio + proteção para terceiros + assistência 24h. */
  valorMensal: number
  /** Cobrança única na adesão, fora da mensalidade. */
  taxaAdesao: number
  /** O que o cliente desembolsa no primeiro mês. */
  primeiroPagamento: number
  /** 12 mensalidades + adesão, para o consultor ter o número anual na mão. */
  totalPrimeiroAno: number
}

const arredondar = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export function calcularTotais(valores: ValoresSimulacao): TotaisSimulacao {
  const valorMensal = arredondar(
    (Number(valores.valorRateio) || 0) +
      (Number(valores.valorProtecaoTerceiros) || 0) +
      (Number(valores.valorAssistencia) || 0) +
      (Number(valores.valorBeneficiosExtras) || 0)
  )
  const taxaAdesao = arredondar(Number(valores.taxaAdesao) || 0)

  return {
    valorMensal,
    taxaAdesao,
    primeiroPagamento: arredondar(valorMensal + taxaAdesao),
    totalPrimeiroAno: arredondar(valorMensal * 12 + taxaAdesao),
  }
}

/**
 * Espelha `crm_categoria_por_valor` do banco: faixa exata, senão a faixa
 * mais próxima por baixo, senão a primeira. Nunca devolve indefinido quando
 * existe ao menos uma categoria ativa.
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

/** "Cobertura de R$ 250.000,01 até R$ 350.000,00" / "Acima de R$ 350.000,00". */
export function descreverFaixa(
  categoria: Pick<Categoria, "valor_min" | "valor_max"> | null | undefined
): string {
  if (!categoria) return "—"
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
  if (min <= 0) return `Até ${fmt(Number(categoria.valor_max))}`
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
