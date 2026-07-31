/**
 * Acesso a dados do CRM. Tudo passa pelo cliente Supabase do navegador —
 * a RLS da migração é quem decide o que cada papel pode ver e escrever.
 */

import { supabase } from "@/lib/supabase"
import type {
  Beneficio,
  Cadastro,
  Categoria,
  Cliente,
  Cobertura,
  Configuracoes,
  CrmUsuario,
  DashboardResumo,
  PdfGerado,
  Simulacao,
  SimulacaoDetalhe,
  StatusSimulacao,
  Veiculo,
} from "./types"

const BUCKET = "crm-arquivos"

/** Erro do Supabase vira mensagem legível em português para o toast. */
function falhar(contexto: string, erro: { message?: string } | null): never {
  const detalhe = erro?.message ?? "erro desconhecido"
  throw new Error(`${contexto}: ${detalhe}`)
}

// ---------------------------------------------------------------------
// Sessão e usuário
// ---------------------------------------------------------------------

/**
 * Garante que o usuário logado tenha ficha no CRM. O primeiro a entrar vira
 * admin; os demais entram como consultor (regra está na função do banco).
 */
export async function garantirUsuarioCrm(): Promise<CrmUsuario> {
  const { data, error } = await supabase.rpc("crm_garantir_usuario")
  if (error) falhar("Não foi possível carregar seu acesso ao CRM", error)
  return data as CrmUsuario
}

export async function listarUsuarios(): Promise<CrmUsuario[]> {
  const { data, error } = await supabase
    .from("crm_usuarios")
    .select("*")
    .order("created_at")
  if (error) falhar("Não foi possível listar os usuários", error)
  return (data ?? []) as CrmUsuario[]
}

export async function atualizarUsuario(
  id: string,
  patch: Partial<Pick<CrmUsuario, "nome" | "papel" | "ativo">>
): Promise<void> {
  const { error } = await supabase.from("crm_usuarios").update(patch).eq("id", id)
  if (error) falhar("Não foi possível atualizar o usuário", error)
}

// ---------------------------------------------------------------------
// Cadastros base (configurações, categorias, coberturas, benefícios)
// ---------------------------------------------------------------------

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase
    .from("crm_configuracoes")
    .select("*")
    .eq("id", true)
    .single()
  if (error) falhar("Não foi possível carregar as configurações", error)
  return data as Configuracoes
}

export async function salvarConfiguracoes(
  patch: Partial<Configuracoes>
): Promise<void> {
  const { error } = await supabase
    .from("crm_configuracoes")
    .update(patch)
    .eq("id", true)
  if (error) falhar("Não foi possível salvar as configurações", error)
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("crm_categorias")
    .select("*")
    .order("ordem")
  if (error) falhar("Não foi possível carregar as categorias", error)
  return (data ?? []) as Categoria[]
}

export async function salvarCategoria(
  categoria: Partial<Categoria> & { id?: string }
): Promise<void> {
  const { id, ...campos } = categoria
  const { error } = id
    ? await supabase.from("crm_categorias").update(campos).eq("id", id)
    : await supabase.from("crm_categorias").insert(campos)
  if (error) falhar("Não foi possível salvar a categoria", error)
}

export async function excluirCategoria(id: string): Promise<void> {
  const { error } = await supabase.from("crm_categorias").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a categoria", error)
}

export async function listarCoberturas(): Promise<Cobertura[]> {
  const { data, error } = await supabase
    .from("crm_coberturas")
    .select("*")
    .order("ordem")
  if (error) falhar("Não foi possível carregar as coberturas", error)
  return (data ?? []) as Cobertura[]
}

export async function salvarCobertura(
  cobertura: Partial<Cobertura> & { id?: string }
): Promise<void> {
  const { id, ...campos } = cobertura
  const { error } = id
    ? await supabase.from("crm_coberturas").update(campos).eq("id", id)
    : await supabase.from("crm_coberturas").insert(campos)
  if (error) falhar("Não foi possível salvar a cobertura", error)
}

export async function excluirCobertura(id: string): Promise<void> {
  const { error } = await supabase.from("crm_coberturas").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a cobertura", error)
}

export async function listarBeneficios(): Promise<Beneficio[]> {
  const { data, error } = await supabase
    .from("crm_beneficios")
    .select("*")
    .order("ordem")
  if (error) falhar("Não foi possível carregar os benefícios", error)
  return (data ?? []) as Beneficio[]
}

export async function salvarBeneficio(
  beneficio: Partial<Beneficio> & { id?: string }
): Promise<void> {
  const { id, ...campos } = beneficio
  const { error } = id
    ? await supabase.from("crm_beneficios").update(campos).eq("id", id)
    : await supabase.from("crm_beneficios").insert(campos)
  if (error) falhar("Não foi possível salvar o benefício", error)
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

export async function obterResumoDashboard(): Promise<DashboardResumo> {
  const { data, error } = await supabase.rpc("crm_dashboard_resumo")
  if (error) falhar("Não foi possível carregar o dashboard", error)
  return data as DashboardResumo
}

// ---------------------------------------------------------------------
// Simulações
// ---------------------------------------------------------------------

export interface FiltroSimulacoes {
  busca?: string
  status?: StatusSimulacao | "todas"
  limite?: number
}

export async function listarSimulacoes(
  filtro: FiltroSimulacoes = {}
): Promise<SimulacaoDetalhe[]> {
  let consulta = supabase
    .from("crm_simulacoes_detalhe")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filtro.limite ?? 200)

  if (filtro.status && filtro.status !== "todas") {
    consulta = consulta.eq("status", filtro.status)
  }

  const termo = filtro.busca?.trim()
  if (termo) {
    const escapado = termo.replace(/[%,()]/g, " ")
    consulta = consulta.or(
      [
        `cliente_nome.ilike.%${escapado}%`,
        `veiculo_placa.ilike.%${escapado.replace(/[^A-Za-z0-9]/g, "")}%`,
        `veiculo_modelo.ilike.%${escapado}%`,
        `veiculo_marca.ilike.%${escapado}%`,
        `cliente_telefone.ilike.%${escapado}%`,
      ].join(",")
    )
  }

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar as simulações", error)
  return (data ?? []) as SimulacaoDetalhe[]
}

export async function obterSimulacao(id: string): Promise<SimulacaoDetalhe> {
  const { data, error } = await supabase
    .from("crm_simulacoes_detalhe")
    .select("*")
    .eq("id", id)
    .single()
  if (error) falhar("Não foi possível carregar a simulação", error)
  return data as SimulacaoDetalhe
}

/** Simulação + cliente e veículo completos, para preencher a tela de edição. */
export async function obterSimulacaoCompleta(id: string): Promise<{
  simulacao: Simulacao
  cliente: Cliente
  veiculo: Veiculo
}> {
  const { data, error } = await supabase
    .from("crm_simulacoes")
    .select("*, cliente:crm_clientes(*), veiculo:crm_veiculos(*)")
    .eq("id", id)
    .single()
  if (error) falhar("Não foi possível carregar a simulação", error)

  const linha = data as Simulacao & { cliente: Cliente; veiculo: Veiculo }
  const { cliente, veiculo, ...simulacao } = linha
  return { simulacao: simulacao as Simulacao, cliente, veiculo }
}

export interface PayloadSimulacao {
  simulacao_id?: string | null
  cliente: {
    id?: string | null
    tipo_pessoa?: string
    nome: string
    telefone?: string | null
    whatsapp?: string | null
    email?: string | null
    cidade?: string | null
    estado?: string | null
    observacoes?: string | null
  }
  veiculo: {
    id?: string | null
    placa: string
    marca?: string | null
    modelo?: string | null
    ano_modelo?: number | string | null
    ano_fabricacao?: number | string | null
    valor_mercado: number
    restricoes?: string[]
    restricoes_descricao?: string | null
    observacoes?: string | null
  }
  valor_mercado: number
  valor_rateio: number
  valor_protecao_terceiros: number
  valor_assistencia: number
  valor_beneficios_extras: number
  taxa_adesao: number
  coberturas_snapshot: unknown[]
  beneficios_snapshot: unknown[]
  observacoes?: string | null
  status?: StatusSimulacao
}

/** Cria ou atualiza cliente + veículo + simulação em uma transação só. */
export async function salvarSimulacao(
  payload: PayloadSimulacao
): Promise<string> {
  const { data, error } = await supabase.rpc("crm_salvar_simulacao", {
    p_payload: payload,
  })
  if (error) falhar("Não foi possível salvar a simulação", error)
  return data as string
}

export async function atualizarStatusSimulacao(
  id: string,
  status: StatusSimulacao
): Promise<void> {
  const { error } = await supabase
    .from("crm_simulacoes")
    .update({ status })
    .eq("id", id)
  if (error) falhar("Não foi possível atualizar o status", error)
}

export async function duplicarSimulacao(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("crm_duplicar_simulacao", {
    p_id: id,
  })
  if (error) falhar("Não foi possível duplicar a simulação", error)
  return data as string
}

export async function excluirSimulacao(id: string): Promise<void> {
  const { error } = await supabase.from("crm_simulacoes").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a simulação", error)
}

/** Confirma a simulação e devolve o cadastro definitivo criado no mesmo passo. */
export async function confirmarSimulacao(id: string): Promise<Cadastro> {
  const { data, error } = await supabase.rpc("crm_confirmar_simulacao", {
    p_simulacao_id: id,
  })
  if (error) falhar("Não foi possível confirmar a simulação", error)
  return data as Cadastro
}

// ---------------------------------------------------------------------
// Clientes e veículos
// ---------------------------------------------------------------------

export async function listarClientes(busca?: string): Promise<Cliente[]> {
  let consulta = supabase
    .from("crm_clientes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const termo = busca?.trim()
  if (termo) {
    const escapado = termo.replace(/[%,()]/g, " ")
    consulta = consulta.or(
      [
        `nome.ilike.%${escapado}%`,
        `razao_social.ilike.%${escapado}%`,
        `cpf.ilike.%${escapado}%`,
        `cnpj.ilike.%${escapado}%`,
        `telefone.ilike.%${escapado}%`,
        `cidade.ilike.%${escapado}%`,
      ].join(",")
    )
  }

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar os clientes", error)
  return (data ?? []) as Cliente[]
}

export async function obterCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from("crm_clientes")
    .select("*")
    .eq("id", id)
    .single()
  if (error) falhar("Não foi possível carregar o cliente", error)
  return data as Cliente
}

export async function salvarCliente(
  cliente: Partial<Cliente> & { id?: string }
): Promise<string> {
  const { id, created_at, updated_at, ...campos } = cliente as Record<
    string,
    unknown
  > & { id?: string }
  void created_at
  void updated_at

  if (id) {
    const { error } = await supabase.from("crm_clientes").update(campos).eq("id", id)
    if (error) falhar("Não foi possível salvar o cliente", error)
    return id
  }

  const { data, error } = await supabase
    .from("crm_clientes")
    .insert(campos)
    .select("id")
    .single()
  if (error) falhar("Não foi possível criar o cliente", error)
  return (data as { id: string }).id
}

export interface VeiculoComCliente extends Veiculo {
  cliente: Pick<Cliente, "id" | "nome" | "telefone"> | null
  categoria: Pick<Categoria, "codigo" | "nome"> | null
}

export async function listarVeiculos(busca?: string): Promise<VeiculoComCliente[]> {
  let consulta = supabase
    .from("crm_veiculos")
    .select(
      "*, cliente:crm_clientes(id, nome, telefone), categoria:crm_categorias(codigo, nome)"
    )
    .order("created_at", { ascending: false })
    .limit(200)

  const termo = busca?.trim()
  if (termo) {
    const escapado = termo.replace(/[%,()]/g, " ")
    const placa = escapado.replace(/[^A-Za-z0-9]/g, "")
    consulta = consulta.or(
      [
        `placa.ilike.%${placa}%`,
        `modelo.ilike.%${escapado}%`,
        `marca.ilike.%${escapado}%`,
        `chassi.ilike.%${escapado}%`,
      ].join(",")
    )
  }

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar os veículos", error)
  return (data ?? []) as VeiculoComCliente[]
}

// ---------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------

export interface PdfComSimulacao extends PdfGerado {
  simulacao: {
    numero: number
    status: StatusSimulacao
    cliente: { nome: string } | null
    veiculo: { placa: string } | null
  } | null
}

export async function listarPdfs(simulacaoId?: string): Promise<PdfComSimulacao[]> {
  let consulta = supabase
    .from("crm_pdfs")
    .select(
      "*, simulacao:crm_simulacoes(numero, status, cliente:crm_clientes(nome), veiculo:crm_veiculos(placa))"
    )
    .order("created_at", { ascending: false })
    .limit(200)

  if (simulacaoId) consulta = consulta.eq("simulacao_id", simulacaoId)

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar os PDFs", error)
  return (data ?? []) as PdfComSimulacao[]
}

/**
 * Guarda o PDF no bucket privado e registra a versão. Se o upload falhar, a
 * simulação continua válida — o consultor só perde o arquivo arquivado, e o
 * download local já aconteceu antes desta chamada.
 */
export async function arquivarPdf(
  simulacaoId: string,
  numero: number,
  arquivo: Blob
): Promise<PdfGerado | null> {
  const caminho = `propostas/${simulacaoId}/${Date.now()}-proposta-${numero}.pdf`

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: "application/pdf", upsert: false })
  if (erroUpload) {
    console.error("Falha ao arquivar o PDF no storage:", erroUpload.message)
    return null
  }

  const { data: sessao } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("crm_pdfs")
    .insert({
      simulacao_id: simulacaoId,
      arquivo_path: caminho,
      tamanho_bytes: arquivo.size,
      gerado_por: sessao?.user?.id ?? null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Falha ao registrar o PDF:", error.message)
    return null
  }
  return data as PdfGerado
}

/** Link temporário (1 h) para baixar um PDF já arquivado. */
export async function urlAssinadaPdf(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 60 * 60)
  if (error) falhar("Não foi possível gerar o link do PDF", error)
  return (data as { signedUrl: string }).signedUrl
}

// ---------------------------------------------------------------------
// Cadastros definitivos
// ---------------------------------------------------------------------

export interface CadastroComRelacoes extends Cadastro {
  cliente: Cliente | null
  veiculo: Veiculo | null
}

export async function listarCadastros(): Promise<CadastroComRelacoes[]> {
  const { data, error } = await supabase
    .from("crm_cadastros")
    .select("*, cliente:crm_clientes(*), veiculo:crm_veiculos(*)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) falhar("Não foi possível listar os cadastros", error)
  return (data ?? []) as CadastroComRelacoes[]
}

export async function atualizarCadastro(
  id: string,
  patch: Partial<Cadastro>
): Promise<void> {
  const { error } = await supabase.from("crm_cadastros").update(patch).eq("id", id)
  if (error) falhar("Não foi possível atualizar o cadastro", error)
}
