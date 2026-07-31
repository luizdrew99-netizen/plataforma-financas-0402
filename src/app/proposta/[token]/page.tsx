"use client"

/**
 * Página pública da proposta — é o destino do QR code impresso no PDF.
 * Não exige login: lê pela RPC `crm_proposta_publica`, que devolve apenas o
 * que já está no papel que o cliente recebeu.
 */

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck, Truck } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { formatarMoeda, formatarPlaca, formatarData, somenteDigitos } from "@/lib/crm/format"
import { descreverFaixa } from "@/lib/crm/calc"
import type { BeneficioSnapshot, CoberturaSnapshot } from "@/lib/crm/types"

interface PropostaPublica {
  numero: number
  status: string
  created_at: string
  valor_mercado: number
  valor_rateio: number
  valor_mensal: number
  taxa_adesao: number
  coberturas: CoberturaSnapshot[]
  beneficios: BeneficioSnapshot[]
  observacoes: string | null
  cliente_nome: string
  veiculo_placa: string
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano_modelo: number | null
  veiculo_ano_fabricacao: number | null
  categoria_codigo: string | null
  categoria_valor_min: number | null
  categoria_valor_max: number | null
  empresa: {
    nome: string
    telefone: string | null
    whatsapp: string | null
    email: string | null
    site: string | null
    logo_url: string | null
    rodape: string
    validade_dias: number
  }
}

export default function PaginaPropostaPublica() {
  const { token } = useParams<{ token: string }>()
  const [proposta, setProposta] = useState<PropostaPublica | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    supabase
      .rpc("crm_proposta_publica", { p_token: token })
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

  if (!proposta) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Proposta não encontrada</h1>
          <p className="mt-2 text-sm text-slate-500">
            Este link pode ter expirado ou a proposta foi cancelada. Fale com seu
            consultor para receber uma nova.
          </p>
        </div>
      </div>
    )
  }

  const validade = new Date(proposta.created_at)
  validade.setDate(validade.getDate() + (proposta.empresa.validade_dias ?? 7))

  const whatsapp = somenteDigitos(proposta.empresa.whatsapp)
  const veiculo = [proposta.veiculo_marca, proposta.veiculo_modelo]
    .filter(Boolean)
    .join(" ")
  const anos = [proposta.veiculo_ano_fabricacao, proposta.veiculo_ano_modelo]
    .filter(Boolean)
    .join("/")

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="bg-[#0E2A47] px-4 py-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-white/10">
              <Truck className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{proposta.empresa.nome}</p>
              <p className="text-xs text-[#9FB6CC]">Proteção veicular</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#9FB6CC]">Proposta</p>
            <p className="font-mono text-lg font-bold">
              #{String(proposta.numero).padStart(6, "0")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Olá, {proposta.cliente_nome}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            Cobertura para a placa {formatarPlaca(proposta.veiculo_placa)}
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
                {proposta.categoria_codigo ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                {descreverFaixa(
                  proposta.categoria_valor_min !== null
                    ? {
                        valor_min: proposta.categoria_valor_min,
                        valor_max: proposta.categoria_valor_max,
                      }
                    : null
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Válida até</p>
              <p className="font-semibold text-slate-900">
                {formatarData(validade)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Coberturas incluídas</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {proposta.coberturas.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {c.nome}
              </li>
            ))}
          </ul>
        </section>

        {proposta.beneficios.map((b, i) => (
          <section key={b.chave ?? i} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Benefício {i + 1}</p>
                <h2 className="font-semibold text-slate-900">{b.titulo}</h2>
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
          {proposta.beneficios.map((b, i) => (
            <div
              key={b.chave ?? i}
              className="flex items-center justify-between py-1 text-sm"
            >
              <span className="text-[#C7D6E6]">{b.titulo}</span>
              <span className="font-semibold">{formatarMoeda(b.valor)}</span>
            </div>
          ))}

          <div className="my-3 border-t border-[#2F5B87]" />

          <div className="flex items-center justify-between">
            <span className="font-semibold">VALOR MENSAL</span>
            <span className="text-3xl font-bold text-[#FFB27A]">
              {formatarMoeda(proposta.valor_mensal)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#2F5B87] pt-3 text-sm">
            <span className="text-[#C7D6E6]">Taxa de adesão (única)</span>
            <span className="font-semibold">{formatarMoeda(proposta.taxa_adesao)}</span>
          </div>
        </section>

        {!!proposta.observacoes && (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Observações</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {proposta.observacoes}
            </p>
          </section>
        )}

        {proposta.status === "confirmada" && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="text-sm font-medium">
              Esta proposta já foi confirmada e está em processo de cadastro.
            </p>
          </div>
        )}

        {!!whatsapp && (
          <a
            href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(
              `Olá! Quero falar sobre a proposta #${String(proposta.numero).padStart(6, "0")}.`
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
          <p>{proposta.empresa.rodape}</p>
          <p>
            {[
              proposta.empresa.telefone,
              proposta.empresa.email,
              proposta.empresa.site,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </footer>
      </main>
    </div>
  )
}
