/**
 * Regra do próximo vencimento do contrato.
 *
 * Duas formas de definir quando vence, e a ordem importa:
 * 1. `data_vencimento` — uma data específica, quando o combinado é pontual;
 * 2. `dia_vencimento` — o dia do mês, que é o caso normal da mensalidade.
 *
 * Sem nenhum dos dois, o contrato não entra em cobrança e fica de fora dos
 * alertas em vez de aparecer como "vencido" indevidamente.
 */

import type { SituacaoContrato } from "./types"

/** Situações que geram cobrança — cancelado e suspenso ficam de fora. */
const COBRAVEIS: SituacaoContrato[] = ["ativo", "pendente", "inadimplente"]

export type EstadoVencimento = "sem_data" | "vencido" | "vence_em_breve" | "em_dia"

export interface Vencimento {
  data: Date | null
  estado: EstadoVencimento
  /** Negativo quando já passou. */
  diasRestantes: number | null
}

/** Meia-noite local, para comparar datas sem o horário atrapalhar. */
function soData(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Próxima ocorrência do dia do mês. Se o dia já passou neste mês, vai para o
 * mês que vem. Dia 31 em mês curto cai no último dia do mês — quem escolheu
 * 31 quer o fim do mês, não o dia 1º do seguinte.
 */
function proximaOcorrencia(dia: number, hoje: Date): Date {
  const diaValido = Math.min(Math.max(dia, 1), 31)

  const noMes = (ano: number, mes: number) => {
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    return new Date(ano, mes, Math.min(diaValido, ultimoDia))
  }

  const candidato = noMes(hoje.getFullYear(), hoje.getMonth())
  if (candidato >= hoje) return candidato
  return noMes(hoje.getFullYear(), hoje.getMonth() + 1)
}

export function calcularVencimento(
  contrato: {
    situacao: SituacaoContrato
    data_vencimento?: string | null
    dia_vencimento?: number | null
  },
  referencia: Date = new Date(),
  diasDeAlerta = 7
): Vencimento {
  if (!COBRAVEIS.includes(contrato.situacao)) {
    return { data: null, estado: "sem_data", diasRestantes: null }
  }

  const hoje = soData(referencia)
  let data: Date | null = null

  if (contrato.data_vencimento) {
    // Vem como "YYYY-MM-DD"; montar por partes evita o deslocamento de fuso
    // que `new Date("2026-08-10")` provoca (é lido como UTC).
    const [ano, mes, dia] = contrato.data_vencimento.split("-").map(Number)
    if (ano && mes && dia) data = new Date(ano, mes - 1, dia)
  } else if (contrato.dia_vencimento) {
    data = proximaOcorrencia(contrato.dia_vencimento, hoje)
  }

  if (!data) return { data: null, estado: "sem_data", diasRestantes: null }

  const diff = Math.round((soData(data).getTime() - hoje.getTime()) / 86_400_000)

  return {
    data,
    diasRestantes: diff,
    estado: diff < 0 ? "vencido" : diff <= diasDeAlerta ? "vence_em_breve" : "em_dia",
  }
}

export const ESTADO_VENCIMENTO: Record<
  EstadoVencimento,
  { rotulo: string; classe: string }
> = {
  vencido: {
    rotulo: "Vencido",
    classe: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  vence_em_breve: {
    rotulo: "Vence em breve",
    classe: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  em_dia: {
    rotulo: "Em dia",
    classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  sem_data: {
    rotulo: "Sem vencimento",
    classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
}

/** Texto curto para a tabela: "vence em 3 dias", "atrasado 12 dias". */
export function descreverVencimento(v: Vencimento): string {
  if (v.diasRestantes === null) return "—"
  if (v.diasRestantes < 0) {
    const dias = Math.abs(v.diasRestantes)
    return `atrasado ${dias} ${dias === 1 ? "dia" : "dias"}`
  }
  if (v.diasRestantes === 0) return "vence hoje"
  return `vence em ${v.diasRestantes} ${v.diasRestantes === 1 ? "dia" : "dias"}`
}
