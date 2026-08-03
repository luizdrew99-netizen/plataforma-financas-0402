/**
 * Acesso a dados do CRM da ABPAC. Tudo passa pelo cliente Supabase do
 * navegador — a RLS do projeto é quem decide o que cada papel pode ver e
 * escrever (`e_admin()`, `e_gestor()`, `meu_papel()`).
 */

import { supabase } from "@/lib/supabase"
import type {
  Beneficio,
  Categoria,
  Cliente,
  Cobertura,
  Configuracoes,
  Contrato,
  DashboardResumo,
  Perfil,
  Simulacao,
  SimulacaoDetalhe,
  SimulacaoPdf,
  StatusSimulacao,
  Veiculo,
} from "./types"

const BUCKET_PROPOSTAS = "propostas"

/** Erro do Supabase vira mensagem legível em português para o toast. */
function falhar(contexto: string, erro: { message?: string } | null): never {
  throw new Error(`${contexto}: ${erro?.message ?? "erro desconhecido"}`)
}

// ---------------------------------------------------------------------
// Perfil e usuários
// ---------------------------------------------------------------------

/**
 * Perfil do usuário logado. A linha é criada pelo trigger `handle_new_user`
 * no momento do cadastro, então aqui basta ler.
 */
export async function obterMeuPerfil(): Promise<Perfil> {
  const { data: sessao } = await supabase.auth.getUser()
  const uid = sessao?.user?.id
  if (!uid) throw new Error("Sem sessão autenticada.")

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single()
  if (error) falhar("Não foi possível carregar seu perfil", error)
  return data as Perfil
}

export async function listarUsuarios(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at")
  if (error) falhar("Não foi possível listar os usuários", error)
  return (data ?? []) as Perfil[]
}

export async function atualizarUsuario(
  id: string,
  patch: Partial<Pick<Perfil, "nome" | "papel" | "ativo">>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id)
  if (error) falhar("Não foi possível atualizar o usuário", error)
}

// ---------------------------------------------------------------------
// Cadastros base
// ---------------------------------------------------------------------

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase
    .from("configuracoes")
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
    .from("configuracoes")
    .update(patch)
    .eq("id", true)
  if (error) falhar("Não foi possível salvar as configurações", error)
}

/** Tamanho máximo da logo. Ela é embutida em todo PDF gerado — um arquivo
 *  gigante aqui deixaria cada proposta pesada sem nenhum ganho visual. */
export const TAMANHO_MAXIMO_LOGO = 2 * 1024 * 1024

/**
 * Sobe a logo para o bucket público `logos` e grava o endereço nas
 * configurações. Só admin passa: a policy `s_logos_write` exige `e_admin()`.
 *
 * O arquivo antigo não é apagado de propósito — as propostas já emitidas
 * guardam a logo da época dentro do snapshot, e apagar o arquivo furaria a
 * imagem naqueles PDFs e nas páginas públicas antigas.
 */
export async function enviarLogo(
  arquivo: File,
  variante: "clara" | "escura" = "clara"
): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("A logo precisa ser uma imagem (PNG, JPG, SVG ou WebP).")
  }
  if (arquivo.size > TAMANHO_MAXIMO_LOGO) {
    throw new Error(
      `A imagem tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB. O limite é 2 MB.`
    )
  }

  const extensao = arquivo.name.includes(".")
    ? arquivo.name.slice(arquivo.name.lastIndexOf(".")).toLowerCase()
    : ".png"
  const sufixo = variante === "escura" ? "-escura" : ""
  const caminho = `associacao/logo${sufixo}-${Date.now()}${extensao}`

  const { error: erroUpload } = await supabase.storage
    .from("logos")
    .upload(caminho, arquivo, {
      contentType: arquivo.type || "image/png",
      upsert: false,
    })
  if (erroUpload) falhar("Não foi possível enviar a logo", erroUpload)

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(caminho)

  try {
    await salvarConfiguracoes(
      variante === "escura" ? { logo_url_escura: publicUrl } : { logo_url: publicUrl }
    )
  } catch (erro) {
    // Sem o endereço gravado, o arquivo no bucket é lixo que ninguém alcança.
    await supabase.storage.from("logos").remove([caminho])
    throw erro
  }

  return publicUrl
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("categorias")
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
    ? await supabase.from("categorias").update(campos).eq("id", id)
    : await supabase.from("categorias").insert(campos)
  if (error) falhar("Não foi possível salvar a categoria", error)
}

export async function excluirCategoria(id: string): Promise<void> {
  const { error } = await supabase.from("categorias").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a categoria", error)
}

/**
 * Aponta buracos entre as faixas — se existir um vão, um caminhão avaliado
 * ali cairia na faixa mais próxima por baixo em vez da correta.
 */
export async function verificarLacunasCategorias(): Promise<string[]> {
  const { data, error } = await supabase.rpc("verificar_lacunas_categorias")
  if (error) return []
  if (!data) return []
  if (Array.isArray(data)) {
    return data.map((linha) =>
      typeof linha === "string" ? linha : JSON.stringify(linha)
    )
  }
  return [String(data)]
}

export async function listarCoberturas(): Promise<Cobertura[]> {
  const { data, error } = await supabase
    .from("coberturas")
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
    ? await supabase.from("coberturas").update(campos).eq("id", id)
    : await supabase.from("coberturas").insert(campos)
  if (error) falhar("Não foi possível salvar a cobertura", error)
}

export async function excluirCobertura(id: string): Promise<void> {
  const { error } = await supabase.from("coberturas").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a cobertura", error)
}

export async function listarBeneficios(): Promise<Beneficio[]> {
  const { data, error } = await supabase
    .from("beneficios")
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
    ? await supabase.from("beneficios").update(campos).eq("id", id)
    : await supabase.from("beneficios").insert(campos)
  if (error) falhar("Não foi possível salvar o benefício", error)
}

// ---------------------------------------------------------------------
// Dashboard e busca
// ---------------------------------------------------------------------

export async function obterResumoDashboard(): Promise<DashboardResumo> {
  const { data, error } = await supabase.rpc("dashboard_resumo")
  if (error) falhar("Não foi possível carregar o dashboard", error)
  return data as DashboardResumo
}

export interface ResultadoBusca {
  tipo: "cliente" | "veiculo"
  id: string
  titulo: string
  subtitulo: string | null
  referencia: string | null
}

export async function buscaGlobal(termo: string): Promise<ResultadoBusca[]> {
  const { data, error } = await supabase.rpc("busca_global", { p_termo: termo })
  if (error) return []
  return (data ?? []) as ResultadoBusca[]
}

// ---------------------------------------------------------------------
// Simulações
// ---------------------------------------------------------------------

export interface FiltroSimulacoes {
  busca?: string
  status?: StatusSimulacao | "todas"
  clienteId?: string
  limite?: number
}

export async function listarSimulacoes(
  filtro: FiltroSimulacoes = {}
): Promise<SimulacaoDetalhe[]> {
  let consulta = supabase
    .from("simulacoes_detalhe")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filtro.limite ?? 200)

  if (filtro.status && filtro.status !== "todas") {
    consulta = consulta.eq("status", filtro.status)
  }
  if (filtro.clienteId) {
    consulta = consulta.eq("cliente_id", filtro.clienteId)
  }

  const termo = filtro.busca?.trim()
  if (termo) {
    const escapado = termo.replace(/[%,()]/g, " ")
    const placa = escapado.replace(/[^A-Za-z0-9]/g, "")
    consulta = consulta.or(
      [
        `cliente_nome.ilike.%${escapado}%`,
        `numero.ilike.%${escapado}%`,
        `veiculo_placa.ilike.%${placa}%`,
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
    .from("simulacoes_detalhe")
    .select("*")
    .eq("id", id)
    .single()
  if (error) falhar("Não foi possível carregar a simulação", error)
  return data as SimulacaoDetalhe
}

/** Simulação + cliente e veículo completos, para a tela de edição e o PDF. */
export async function obterSimulacaoCompleta(id: string): Promise<{
  simulacao: Simulacao
  cliente: Cliente
  veiculo: Veiculo
}> {
  const { data, error } = await supabase
    .from("simulacoes")
    .select("*, cliente:clientes(*), veiculo:veiculos(*)")
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
    uf?: string | null
    observacoes?: string | null
  }
  veiculo: {
    id?: string | null
    placa: string
    marca?: string | null
    modelo?: string | null
    ano_modelo?: number | string | null
    ano_fabricacao?: number | string | null
    restricoes?: string[]
    restricoes_descricao?: string | null
    observacoes?: string | null
  }
  valor_mercado: number
  valor_rateio: number
  valor_terceiros: number
  valor_assistencia: number
  valor_beneficios_extras: number
  taxa_adesao: number
  coberturas: { nome: string; descricao?: string | null }[]
  beneficios: { codigo: string; nome: string; descricao: string; valor: number }[]
  observacoes?: string | null
  status?: StatusSimulacao
}

/**
 * Cria ou atualiza cliente + veículo + simulação em uma transação só.
 * O snapshot da proposta é montado dentro do banco.
 */
export async function salvarSimulacao(
  payload: PayloadSimulacao
): Promise<string> {
  const { data, error } = await supabase.rpc("salvar_simulacao", {
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
    .from("simulacoes")
    .update({ status })
    .eq("id", id)
  if (error) falhar("Não foi possível atualizar o status", error)
}

export async function duplicarSimulacao(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("duplicar_simulacao", { p_id: id })
  if (error) falhar("Não foi possível duplicar a simulação", error)
  return data as string
}

export async function excluirSimulacao(id: string): Promise<void> {
  const { error } = await supabase.from("simulacoes").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir a simulação", error)
}

/** Confirma a simulação e devolve o contrato criado no mesmo passo. */
export async function confirmarSimulacao(id: string): Promise<Contrato> {
  const { data, error } = await supabase.rpc("confirmar_simulacao", {
    p_simulacao_id: id,
  })
  if (error) falhar("Não foi possível confirmar a simulação", error)
  return data as Contrato
}

/** Corta o acesso ao link público sem apagar a proposta. */
export async function revogarLinkPublico(
  id: string,
  revogado: boolean
): Promise<void> {
  const { error } = await supabase
    .from("simulacoes")
    .update({ token_revogado: revogado })
    .eq("id", id)
  if (error) falhar("Não foi possível alterar o link público", error)
}

// ---------------------------------------------------------------------
// Clientes e veículos
// ---------------------------------------------------------------------

export async function listarClientes(busca?: string): Promise<Cliente[]> {
  let consulta = supabase
    .from("clientes")
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
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single()
  if (error) falhar("Não foi possível carregar o cliente", error)
  return data as Cliente
}

export async function salvarCliente(cliente: Cliente): Promise<string> {
  // Campos gerenciados pelo banco não vão no update.
  const { id, created_at, updated_at, criado_por, ...campos } = cliente
  void created_at
  void updated_at
  void criado_por

  const { error } = await supabase.from("clientes").update(campos).eq("id", id)
  if (error) falhar("Não foi possível salvar o cliente", error)
  return id
}

export interface VeiculoComCliente extends Veiculo {
  cliente: Pick<Cliente, "id" | "nome" | "telefone"> | null
}

export async function listarVeiculos(busca?: string): Promise<VeiculoComCliente[]> {
  let consulta = supabase
    .from("veiculos")
    .select("*, cliente:clientes(id, nome, telefone)")
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

export async function salvarVeiculo(
  id: string,
  patch: Partial<Veiculo>
): Promise<void> {
  const { error } = await supabase.from("veiculos").update(patch).eq("id", id)
  if (error) falhar("Não foi possível salvar o veículo", error)
}

// ---------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------

export interface PdfComSimulacao extends SimulacaoPdf {
  simulacao: {
    numero: string
    status: StatusSimulacao
    cliente: { nome: string } | null
    veiculo: { placa: string } | null
  } | null
}

export async function listarPdfs(simulacaoId?: string): Promise<PdfComSimulacao[]> {
  let consulta = supabase
    .from("simulacao_pdfs")
    .select(
      "*, simulacao:simulacoes(numero, status, cliente:clientes(nome), veiculo:veiculos(placa))"
    )
    .order("created_at", { ascending: false })
    .limit(200)

  if (simulacaoId) consulta = consulta.eq("simulacao_id", simulacaoId)

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar os PDFs", error)
  return (data ?? []) as PdfComSimulacao[]
}

/**
 * Guarda o PDF no bucket `propostas` e registra a versão. Se falhar, a
 * simulação continua válida — o consultor já baixou o arquivo antes desta
 * chamada, então só se perde a cópia arquivada.
 */
export async function arquivarPdf(
  simulacaoId: string,
  numero: string,
  arquivo: Blob
): Promise<SimulacaoPdf | null> {
  const { data: sessao } = await supabase.auth.getUser()
  const usuarioId = sessao?.user?.id
  if (!usuarioId) return null

  // A versão é sequencial por simulação; lê a última para somar 1.
  const { data: ultima } = await supabase
    .from("simulacao_pdfs")
    .select("versao")
    .eq("simulacao_id", simulacaoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle()

  const versao = ((ultima as { versao: number } | null)?.versao ?? 0) + 1
  const caminho = `${simulacaoId}/${numero}-v${versao}-${Date.now()}.pdf`

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_PROPOSTAS)
    .upload(caminho, arquivo, { contentType: "application/pdf", upsert: false })
  if (erroUpload) {
    console.error("Falha ao arquivar o PDF no storage:", erroUpload.message)
    return null
  }

  const { data, error } = await supabase
    .from("simulacao_pdfs")
    .insert({
      simulacao_id: simulacaoId,
      versao,
      storage_path: caminho,
      gerado_por: usuarioId,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Falha ao registrar o PDF:", error.message)
    return null
  }
  return data as SimulacaoPdf
}

/** Link temporário (1 h) para abrir um PDF já arquivado. */
export async function urlAssinadaPdf(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_PROPOSTAS)
    .createSignedUrl(caminho, 60 * 60)
  if (error) falhar("Não foi possível gerar o link do PDF", error)
  return (data as { signedUrl: string }).signedUrl
}

// ---------------------------------------------------------------------
// Documentos (CRLV, CNH, contrato social, fotos…)
// ---------------------------------------------------------------------

export const TIPOS_DOCUMENTO = [
  { valor: "crlv", rotulo: "CRLV" },
  { valor: "cnh", rotulo: "CNH" },
  { valor: "contrato_social", rotulo: "Contrato social" },
  { valor: "comprovante_residencia", rotulo: "Comprovante de residência" },
  { valor: "foto_veiculo", rotulo: "Foto do veículo" },
  { valor: "vistoria", rotulo: "Laudo de vistoria" },
  { valor: "outro", rotulo: "Outro" },
] as const

export interface Documento {
  id: string
  cliente_id: string | null
  veiculo_id: string | null
  tipo: string
  nome_arquivo: string
  storage_path: string
  enviado_por: string
  created_at: string
}

export interface DocumentoComRelacoes extends Documento {
  cliente: { id: string; nome: string } | null
  veiculo: { id: string; placa: string } | null
}

export async function listarDocumentos(filtro?: {
  clienteId?: string
  veiculoId?: string
}): Promise<DocumentoComRelacoes[]> {
  let consulta = supabase
    .from("documentos")
    .select("*, cliente:clientes(id, nome), veiculo:veiculos(id, placa)")
    .order("created_at", { ascending: false })
    .limit(200)

  if (filtro?.clienteId) consulta = consulta.eq("cliente_id", filtro.clienteId)
  if (filtro?.veiculoId) consulta = consulta.eq("veiculo_id", filtro.veiculoId)

  const { data, error } = await consulta
  if (error) falhar("Não foi possível listar os documentos", error)
  return (data ?? []) as DocumentoComRelacoes[]
}

/** Limite generoso, mas que evita estourar o storage sem querer. */
export const TAMANHO_MAXIMO_DOCUMENTO = 15 * 1024 * 1024

/**
 * Sobe o arquivo para o bucket `documentos` e registra a linha.
 * Se o registro falhar depois do upload, o arquivo é removido — senão
 * ficaria lixo no bucket sem nada apontando para ele.
 */
export async function enviarDocumento(
  arquivo: File,
  destino: { clienteId?: string | null; veiculoId?: string | null; tipo: string }
): Promise<Documento> {
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) {
    throw new Error(
      `O arquivo tem ${Math.round(arquivo.size / 1024 / 1024)} MB. O limite é 15 MB.`
    )
  }
  if (!destino.clienteId && !destino.veiculoId) {
    throw new Error("O documento precisa estar ligado a um cliente ou a um veículo.")
  }

  const { data: sessao } = await supabase.auth.getUser()
  const usuarioId = sessao?.user?.id
  if (!usuarioId) throw new Error("Sem sessão autenticada.")

  const pasta = destino.clienteId
    ? `clientes/${destino.clienteId}`
    : `veiculos/${destino.veiculoId}`
  // Nome seguro para o storage, preservando a extensão.
  const extensao = arquivo.name.includes(".")
    ? arquivo.name.slice(arquivo.name.lastIndexOf("."))
    : ""
  const caminho = `${pasta}/${Date.now()}-${destino.tipo}${extensao}`

  const { error: erroUpload } = await supabase.storage
    .from("documentos")
    .upload(caminho, arquivo, {
      contentType: arquivo.type || "application/octet-stream",
      upsert: false,
    })
  if (erroUpload) falhar("Não foi possível enviar o arquivo", erroUpload)

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      cliente_id: destino.clienteId ?? null,
      veiculo_id: destino.veiculoId ?? null,
      tipo: destino.tipo,
      nome_arquivo: arquivo.name,
      storage_path: caminho,
      enviado_por: usuarioId,
    })
    .select("*")
    .single()

  if (error) {
    // Não deixa arquivo órfão no bucket.
    await supabase.storage.from("documentos").remove([caminho])
    falhar("O arquivo subiu, mas não foi possível registrá-lo", error)
  }
  return data as Documento
}

export async function excluirDocumento(
  id: string,
  storagePath: string
): Promise<void> {
  const { error } = await supabase.from("documentos").delete().eq("id", id)
  if (error) falhar("Não foi possível excluir o documento", error)
  // Se o arquivo não sair, sobra lixo no bucket — mas o registro já foi.
  await supabase.storage.from("documentos").remove([storagePath])
}

/** Link temporário (1 h) para abrir um documento. */
export async function urlAssinadaDocumento(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(caminho, 60 * 60)
  if (error) falhar("Não foi possível gerar o link do documento", error)
  return (data as { signedUrl: string }).signedUrl
}

// ---------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------

export interface LinhaAuditoria {
  id: number
  tabela: string
  registro_id: string | null
  acao: string
  usuario_id: string | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  created_at: string
  usuario: { nome: string; email: string } | null
}

export async function listarAuditoria(filtro?: {
  tabela?: string
  acao?: string
  limite?: number
}): Promise<LinhaAuditoria[]> {
  let consulta = supabase
    .from("auditoria")
    .select("*, usuario:profiles(nome, email)")
    .order("created_at", { ascending: false })
    .limit(filtro?.limite ?? 200)

  if (filtro?.tabela && filtro.tabela !== "todas") {
    consulta = consulta.eq("tabela", filtro.tabela)
  }
  if (filtro?.acao && filtro.acao !== "todas") {
    consulta = consulta.eq("acao", filtro.acao)
  }

  const { data, error } = await consulta
  if (error) falhar("Não foi possível carregar a auditoria", error)
  return (data ?? []) as LinhaAuditoria[]
}

// ---------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------

export interface ContratoComRelacoes extends Contrato {
  cliente: Cliente | null
  veiculo: Veiculo | null
  simulacao: { numero: string } | null
}

export async function listarContratos(): Promise<ContratoComRelacoes[]> {
  const { data, error } = await supabase
    .from("contratos")
    .select("*, cliente:clientes(*), veiculo:veiculos(*), simulacao:simulacoes(numero)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) falhar("Não foi possível listar os contratos", error)
  return (data ?? []) as ContratoComRelacoes[]
}

export async function atualizarContrato(
  id: string,
  patch: Partial<Contrato>
): Promise<void> {
  const { error } = await supabase.from("contratos").update(patch).eq("id", id)
  if (error) falhar("Não foi possível atualizar o contrato", error)
}
