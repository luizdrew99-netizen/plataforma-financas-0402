/**
 * Tipos do CRM da ABPAC.
 *
 * Espelham o schema que já existe no Supabase (projeto pgycjyrcjxtjptcfxzvx):
 * `configuracoes`, `categorias`, `coberturas`, `beneficios`, `clientes`,
 * `veiculos`, `simulacoes`, `contratos`, `simulacao_pdfs`, `documentos`,
 * `auditoria` e `profiles`.
 *
 * Detalhe importante do modelo: **o valor de mercado e a categoria moram na
 * simulação, não no veículo**. O mesmo caminhão pode ser simulado em datas
 * diferentes com avaliações diferentes.
 */

export type Papel = "admin" | "supervisor" | "consultor"
export type TipoPessoa = "pf" | "pj"

export type StatusSimulacao =
  | "rascunho"
  | "gerada"
  | "enviada"
  | "em_negociacao"
  | "confirmada"
  | "perdida"
  | "expirada"

export type SituacaoContrato =
  | "ativo"
  | "pendente"
  | "cancelado"
  | "inadimplente"
  | "suspenso"

/** Linha de `profiles` — criada automaticamente pelo trigger `handle_new_user`. */
export interface Perfil {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  created_at: string
}

export interface Configuracoes {
  id: boolean
  nome_associacao: string
  cnpj: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  logo_url: string | null
  logo_url_escura: string | null
  rodape_pdf: string | null
  endereco: string | null
  site: string | null
  observacoes_padrao: string | null
  assinatura_nome: string | null
  assinatura_cargo: string | null
  taxa_adesao_padrao: number
  validade_proposta_dias: number
  updated_at: string
}

export interface Categoria {
  id: string
  codigo: string
  nome: string
  valor_min: number
  /** `null` significa faixa sem teto (a última). */
  valor_max: number | null
  rateio_padrao: number | null
  ordem: number
  ativo: boolean
}

export interface Cobertura {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  ativo: boolean
  padrao: boolean
}

export interface Beneficio {
  id: string
  codigo: string
  nome: string
  descricao: string
  valor_padrao: number
  ordem: number
  ativo: boolean
  padrao: boolean
}

/** Os dois benefícios estruturais, que têm coluna própria na simulação. */
export const CODIGO_TERCEIROS = "terceiros"
export const CODIGO_ASSISTENCIA = "assistencia24h"

export interface Cliente {
  id: string
  tipo_pessoa: TipoPessoa
  nome: string
  cpf: string | null
  rg: string | null
  cnh: string | null
  data_nascimento: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  responsavel: string | null
  cpf_responsavel: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export type RestricaoVeiculo =
  | "leilao"
  | "recuperado_sinistro"
  | "pequena_monta"
  | "media_monta"
  | "grande_monta"
  | "chassi_remarcado"
  | "outras"

export const RESTRICOES_VEICULO: { valor: RestricaoVeiculo; rotulo: string }[] = [
  { valor: "leilao", rotulo: "Passagem por leilão" },
  { valor: "recuperado_sinistro", rotulo: "Recuperado de sinistro" },
  { valor: "pequena_monta", rotulo: "Pequena monta" },
  { valor: "media_monta", rotulo: "Média monta" },
  { valor: "grande_monta", rotulo: "Grande monta" },
  { valor: "chassi_remarcado", rotulo: "Chassi remarcado" },
  { valor: "outras", rotulo: "Outras observações" },
]

export interface Veiculo {
  id: string
  cliente_id: string | null
  placa: string
  marca: string | null
  modelo: string | null
  ano_modelo: number | null
  ano_fabricacao: number | null
  chassi: string | null
  renavam: string | null
  cor: string | null
  restricoes: RestricaoVeiculo[]
  restricoes_descricao: string | null
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------
// Snapshot — a fotografia do que foi vendido, montada pelo banco em
// `salvar_simulacao`. É a fonte do PDF: mesmo que o cadastro mude depois,
// a proposta emitida continua igual ao papel que o cliente recebeu.
// ---------------------------------------------------------------------

export interface SnapshotCobertura {
  nome: string
  descricao?: string | null
}

export interface SnapshotBeneficio {
  codigo: string
  nome: string
  descricao: string
  valor: number
}

export interface SnapshotEmpresa {
  nome_associacao: string | null
  cnpj: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  endereco: string | null
  site: string | null
  logo_url: string | null
  rodape_pdf: string | null
  assinatura_nome: string | null
  assinatura_cargo: string | null
}
// A versão escura da logo não entra no snapshot de propósito: a proposta em
// PDF e a página pública têm fundo claro, então só a logo principal é usada
// nos dois.

export interface SnapshotCategoria {
  codigo: string | null
  nome: string | null
  valor_min: number | null
  valor_max: number | null
}

export interface SnapshotValores {
  valor_mercado: number
  valor_rateio: number
  valor_terceiros: number
  valor_assistencia: number
  valor_beneficios_extras: number
  taxa_adesao: number
  total_mensal: number
}

export interface SnapshotProposta {
  versao: number
  gerado_em: string
  validade_dias: number
  empresa: SnapshotEmpresa
  categoria: SnapshotCategoria
  valores: SnapshotValores
  coberturas: SnapshotCobertura[]
  beneficios: SnapshotBeneficio[]
}

export interface Simulacao {
  id: string
  /** Formato "SIM-2026-000001", gerado pelo banco. */
  numero: string
  cliente_id: string
  veiculo_id: string
  categoria_id: string | null
  valor_mercado: number
  valor_rateio: number
  valor_terceiros: number
  valor_assistencia: number
  valor_beneficios_extras: number
  taxa_adesao: number
  /** rateio + terceiros + assistência + extras, calculado no banco. */
  total_mensal: number
  status: StatusSimulacao
  versao: number
  snapshot: SnapshotProposta | null
  observacoes: string | null
  token_publico: string
  token_expira_em: string | null
  token_revogado: boolean
  criado_por: string | null
  created_at: string
  updated_at: string
}

/** Linha da view `simulacoes_detalhe`. */
export interface SimulacaoDetalhe extends Simulacao {
  cliente_nome: string
  cliente_telefone: string | null
  cliente_whatsapp: string | null
  cliente_email: string | null
  cliente_cidade: string | null
  cliente_uf: string | null
  cliente_tipo_pessoa: TipoPessoa
  veiculo_placa: string
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano_modelo: number | null
  veiculo_ano_fabricacao: number | null
  veiculo_restricoes: RestricaoVeiculo[]
  veiculo_restricoes_descricao: string | null
  categoria_codigo: string | null
  categoria_nome: string | null
  categoria_valor_min: number | null
  categoria_valor_max: number | null
  contrato_id: string | null
  contrato_numero: string | null
  contrato_situacao: SituacaoContrato | null
}

export interface Contrato {
  id: string
  numero: string
  simulacao_id: string | null
  cliente_id: string
  veiculo_id: string
  situacao: SituacaoContrato
  valor_protecao: number
  valor_mensal: number
  taxa_adesao: number
  data_contratacao: string
  data_vencimento: string | null
  dia_vencimento: number | null
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export interface SimulacaoPdf {
  id: string
  simulacao_id: string
  versao: number
  storage_path: string
  gerado_por: string
  created_at: string
}

export interface PontoSerieMensal {
  mes: string
  simulacoes: number
  confirmadas: number
  valor: number
}

export interface DashboardResumo {
  total_simulacoes: number
  simulacoes_hoje: number
  simulacoes_mes: number
  confirmadas: number
  valor_medio: number
  ticket_confirmado_mes: number
  total_clientes: number
  total_veiculos: number
  contratos_ativos: number
  serie_mensal: PontoSerieMensal[]
}

export const STATUS_SIMULACAO: Record<
  StatusSimulacao,
  { rotulo: string; classe: string }
> = {
  rascunho: {
    rotulo: "Rascunho",
    classe: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  gerada: {
    rotulo: "Gerada",
    classe: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  enviada: {
    rotulo: "Enviada",
    classe: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  em_negociacao: {
    rotulo: "Em negociação",
    classe: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  confirmada: {
    rotulo: "Confirmada",
    classe:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  perdida: {
    rotulo: "Perdida",
    classe: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  expirada: {
    rotulo: "Expirada",
    classe: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
}

export const SITUACAO_CONTRATO: Record<
  SituacaoContrato,
  { rotulo: string; classe: string }
> = {
  ativo: {
    rotulo: "Ativo",
    classe:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  pendente: {
    rotulo: "Pendente",
    classe: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  cancelado: {
    rotulo: "Cancelado",
    classe: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  inadimplente: {
    rotulo: "Inadimplente",
    classe: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  suspenso: {
    rotulo: "Suspenso",
    classe:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
}

export const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const
