"use client"

/**
 * Página pública da proposta — é o destino do QR code impresso no PDF.
 * Não exige login: lê pela RPC `proposta_publica`, que roda como SECURITY
 * DEFINER, respeita token revogado/expirado e devolve apenas o que já está
 * no papel que o cliente recebeu.
 */

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck } from "lucide-react"

import { supabase } from "@/lib/supabase"
import {
  formatarData,
  formatarMoeda,
  formatarPlaca,
  somenteDigitos,
} from "@/lib/crm/format"
import { descreverFaixa } from "@/lib/crm/calc"
import { LogoAssociacao } from "@/components/crm/logo-associacao"
import type { SnapshotProposta } from "@/lib/crm/types"

interface PropostaPublica {
  erro?: "nao_encontrada" | "revogada" | "expirada"
  numero: string
  versao: number
  data: string
  cliente_nome: string
  cidade: string | null
  uf: string | null
  placa: string
  marca: string | null
  modelo: string | null
  ano_modelo: number | null
  ano_fabricacao: number | null
  restricoes: string | null
  valor_mercado: number
  valor_rateio: number
  valor_terceiros: number
  valor_assistencia: number
  taxa_adesao: number
  total_mensal: number
  observacoes: string | null
  snapshot: SnapshotProposta | null
}

const MENSAGEM_ERRO: Record<string, { titulo: string; texto: string }> = {
  nao_encontrada: {
    titulo: "Proposta não encontrada",
    texto: "Confira o link com seu consultor — ele pode ter sido digitado errado.",
  },
  revogada: {
    titulo: "Este link foi desativado",
    texto: "A associação encerrou o acesso a esta proposta. Peça um link novo ao seu consultor.",
  },
  expirada: {
    titulo: "Proposta expirada",
    texto: "O prazo de validade desta simulação terminou. Seu consultor pode emitir uma atualizada.",
  },
}

export default function PaginaPropostaPublica() {
  const { token } = useParams<{ token: string }>()
  const [proposta, setProposta] = useState<PropostaPublica | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    supabase
      .rpc("proposta_publica", { p_token: token })
      .then(({ data, error }) => {
        if (!ativo) return
        if (!error && data) setProposta(data as PropostaPublica)
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [token])

  if (carregando) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!proposta || proposta.erro) {
    const info =
      MENSAGEM_ERRO[proposta?.erro ?? "nao_encontrada"] ??
      MENSAGEM_ERRO.nao_encontrada
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900">{info.titulo}</h1>
          <p className="mt-2 text-sm text-slate-500">{info.texto}</p>
        </div>
      </div>
    )
  }

  const snap = proposta.snapshot
  const empresa = snap?.empresa
  const beneficios = snap?.beneficios ?? []
  const coberturas = snap?.coberturas ?? []

  const validade = new Date(proposta.data)
  validade.setDate(validade.getDate() + (snap?.validade_dias ?? 30))

  const whatsapp = somenteDigitos(empresa?.whatsapp)
  const veiculo = [proposta.marca, proposta.modelo].filter(Boolean).join(" ")
  const anos = [proposta.ano_fabricacao, proposta.ano_modelo]
    .filter(Boolean)
    .join("/")

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="bg-[#0E2A47] px-4 py-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* O cabeçalho é azul-escuro e a logo pode ter traço escuro — daí a
                lasca branca por baixo, que funciona com qualquer arquivo. */}
            <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
              <LogoAssociacao
                url={empresa?.logo_url}
                nome={empresa?.nome_associacao}
                altura={40}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">
                {empresa?.nome_associacao ?? "Proteção Veicular"}
              </p>
              <p className="text-xs text-[#9FB6CC]">Simulação de proteção veicular</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-[#9FB6CC]">Proposta</p>
            <p className="font-mono text-sm font-bold">{proposta.numero}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Olá, {proposta.cliente_nome}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            Cobertura para a placa {formatarPlaca(proposta.placa)}
          </h1>
          <p className="mt-1 text-slate-600">
            {veiculo || "Veículo"}
            {anos ? ` · ${anos}` : ""}
          </p>

          <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Valor de mercado</p>
              <p className="font-semibold text-slate-900">
                {formatarMoeda(proposta.valor_mercado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Categoria</p>
              <p className="font-semibold text-slate-900">
                {snap?.categoria?.codigo ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                {descreverFaixa(snap?.categoria ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Válida até</p>
              <p className="font-semibold text-slate-900">{formatarData(validade)}</p>
            </div>
          </div>
        </section>

        {coberturas.length > 0 && (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Coberturas incluídas</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {coberturas.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {c.nome}
                </li>
              ))}
            </ul>
          </section>
        )}

        {beneficios.map((b, i) => (
          <section
            key={b.codigo ?? i}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Benefício {i + 1}</p>
                <h2 className="font-semibold text-slate-900">{b.nome}</h2>
              </div>
              <p className="shrink-0 text-lg font-bold text-[#C2410C]">
                {formatarMoeda(b.valor)}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
              {b.descricao}
            </p>
          </section>
        ))}

        <section className="rounded-xl bg-[#0E2A47] p-5 text-white shadow-sm">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-[#C7D6E6]">Valor do rateio</span>
            <span className="font-semibold">{formatarMoeda(proposta.valor_rateio)}</span>
          </div>
          {beneficios.map((b, i) => (
            <div
              key={b.codigo ?? i}
              className="flex items-center justify-between py-1 text-sm"
            >
              <span className="text-[#C7D6E6]">{b.nome}</span>
              <span className="font-semibold">{formatarMoeda(b.valor)}</span>
            </div>
          ))}

          <div className="my-3 border-t border-[#2F5B87]" />

          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">VALOR MENSAL</span>
            <span className="text-2xl font-bold text-[#FFB27A] sm:text-3xl">
              {formatarMoeda(proposta.total_mensal)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#2F5B87] pt-3 text-sm">
            <span className="text-[#C7D6E6]">Taxa de adesão (única)</span>
            <span className="font-semibold">{formatarMoeda(proposta.taxa_adesao)}</span>
          </div>
        </section>

        {!!proposta.restricoes && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">
              Observações sobre o veículo
            </h2>
            <p className="mt-1 text-sm text-amber-800">{proposta.restricoes}</p>
          </section>
        )}

        {!!proposta.observacoes && (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Observações</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {proposta.observacoes}
            </p>
          </section>
        )}

        {!!whatsapp && (
          <a
            href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(
              `Olá! Quero falar sobre a proposta ${proposta.numero}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="size-5" />
            Falar com o consultor
          </a>
        )}

        <footer className="space-y-1 py-4 text-center text-xs text-slate-500">
          {!!empresa?.rodape_pdf && <p>{empresa.rodape_pdf}</p>}
          <p>
            {[empresa?.telefone, empresa?.email, empresa?.site]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="flex items-center justify-center gap-1 pt-1">
            <CheckCircle2 className="size-3" />
            Versão {proposta.versao} · emitida em {formatarData(proposta.data)}
          </p>
        </footer>
      </main>
    </div>
  )
}
