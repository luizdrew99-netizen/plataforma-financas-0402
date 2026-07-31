/**
 * Tipos do CRM de Proteção Veicular.
 * Espelham as tabelas `crm_*` criadas na migração
 * `20260731000100_crm_protecao_veicular.sql`.
 */

export type CrmPapel = "admin" | "supervisor" | "consultor"
export type TipoPessoa = "fisica" | "juridica"
export type StatusSimulacao =
  | "rascunho"
  | "gerada"
  | "enviada"
  | "confirmada"
  | "cancelada"
export type SituacaoCadastro =
  | "ativo"
  | "pendente"
  | "cancelado"
  | "inadimplente"
  | "suspenso"

export interface CrmUsuario {
  id: string
  nome: string | null
  email: string | null
  papel: CrmPapel
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Configuracoes {
  id: boolean
  nome_empresa: string
  cnpj: string | null
  logo_url: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  endereco: string | null
  site: string | null
  rodape_pdf: string
  observacoes_padrao: string | null
  taxa_adesao_padrao: number
  validade_proposta_dias: number
  assinatura_nome: string | null
  assinatura_cargo: string | null
  updated_at: string
}

export interface Categoria {
  id: string
  codigo: string
  nome: string
  valor_min: number
  /** `null` significa faixa sem teto (a última). */
  valor_max: number | null
  rateio_sugerido: number | null
  ordem: number
  ativo: boolean
}

export interface Cobertura {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  padrao: boolean
  ativo: boolean
}

export interface Beneficio {
  id: string
  chave: string
  titulo: string
  descricao: string
  valor_padrao: number
  ordem: number
  padrao: boolean
  ativo: boolean
}

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
  estado: string | null
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

/** Restrições declaradas do veículo (leilão, monta, chassi remarcado…). */
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
  valor_mercado: number
  categoria_id: string | null
  tipo_veiculo: string
  restricoes: RestricaoVeiculo[]
  restricoes_descricao: string | null
  observacoes: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

/** Cobertura como ficou gravada na simulação (não muda se o cadastro mudar). */
export interface CoberturaSnapshot {
  nome: string
  descricao?: string | null
}

/** Benefício como ficou gravado na simulação, com o valor efetivamente vendido. */
export interface BeneficioSnapshot {
  chave: string
  titulo: string
  descricao: string
  valor: number
}

export interface Simulacao {
  id: string
  numero: number
  cliente_id: string
  veiculo_id: string
  categoria_id: string | null
  valor_mercado: number
  valor_rateio: number
  valor_protecao_terceiros: number
  valor_assistencia: number
  /** Soma dos benefícios cadastrados além dos dois padrão. */
  valor_beneficios_extras: number
  taxa_adesao: number
  /** Coluna gerada pelo banco: rateio + terceiros + assistência + extras. */
  valor_mensal: number
  coberturas_snapshot: CoberturaSnapshot[]
  beneficios_snapshot: BeneficioSnapshot[]
  observacoes: string | null
  status: StatusSimulacao
  token_publico: string
  confirmada_em: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

/** Linha da view `crm_simulacoes_detalhe`: simulação + cliente + veículo + categoria. */
export interface SimulacaoDetalhe extends Simulacao {
  cliente_nome: string
  cliente_telefone: string | null
  cliente_cidade: string | null
  cliente_estado: string | null
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
  cadastro_id: string | null
  cadastro_numero: number | null
  cadastro_situacao: SituacaoCadastro | null
}

export interface Cadastro {
  id: string
  numero: number
  simulacao_id: string | null
  cliente_id: string
  veiculo_id: string
  situacao: SituacaoCadastro
  valor_protecao: number
  valor_mensal: number
  taxa_adesao: number
  data_contratacao: string
  data_vencimento: string | null
  dia_vencimento: number | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface PdfGerado {
  id: string
  simulacao_id: string
  versao: number
  arquivo_path: string
  tamanho_bytes: number | null
  gerado_por: string | null
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
  cadastros_confirmados: number
  valor_medio: number
  ticket_total_mes: number
  total_clientes: number
  total_veiculos: number
  serie_mensal: PontoSerieMensal[]
}

export const STATUS_SIMULACAO: Record<
  StatusSimulacao,
  { rotulo: string; classe: string }
> = {
  rascunho: {
    rotulo: "Rascunho",
    classe:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  gerada: {
    rotulo: "Gerada",
    classe: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  enviada: {
    rotulo: "Enviada",
    classe:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  confirmada: {
    rotulo: "Confirmada",
    classe:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  cancelada: {
    rotulo: "Cancelada",
    classe: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
}

export const SITUACAO_CADASTRO: Record<
  SituacaoCadastro,
  { rotulo: string; classe: string }
> = {
  ativo: {
    rotulo: "Ativo",
    classe:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  pendente: {
    rotulo: "Pendente",
    classe:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
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
