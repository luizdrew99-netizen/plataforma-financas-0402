"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FormularioSimulacao,
  type SimulacaoParaEdicao,
} from "@/components/crm/formulario-simulacao"
import { obterSimulacaoCompleta } from "@/lib/crm/queries"
import { formatarNumeroSimulacao } from "@/lib/crm/format"

export default function PaginaEditarSimulacao() {
  const { id } = useParams<{ id: string }>()
  const [dados, setDados] = useState<SimulacaoParaEdicao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    obterSimulacaoCompleta(id)
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : "Falha ao carregar."))
    return () => {
      ativo = false
    }
  }, [id])

  if (erro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Não foi possível abrir a simulação</CardTitle>
          <CardDescription>{erro}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/crm/simulacoes">Voltar para a lista</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!dados) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/crm/simulacoes/${id}`} aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">
            Editar {formatarNumeroSimulacao(dados.simulacao.numero)}
          </h2>
          <p className="text-muted-foreground text-sm">
            Ao salvar, uma nova versão do PDF é gerada com os valores atualizados.
          </p>
        </div>
      </div>

      {/* A chave força o formulário a remontar se a simulação carregada mudar. */}
      <FormularioSimulacao key={dados.simulacao.id} existente={dados} />
    </div>
  )
}
