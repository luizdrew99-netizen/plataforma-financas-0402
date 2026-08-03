"use client"

import { useEffect, useState } from "react"
import { Truck } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  /** URL da logo (vem de `configuracoes.logo_url`). */
  url?: string | null
  /** Altura da imagem em pixels. A largura acompanha a proporção do arquivo. */
  altura?: number
  /** Texto alternativo — normalmente o nome da associação. */
  nome?: string | null
  /**
   * Força o monograma mesmo havendo logo. Serve para espaços estreitos: numa
   * faixa de 3rem, uma logo deitada ou vaza para fora ou fica ilegível.
   */
  monograma?: boolean
  className?: string
}

/**
 * Logo da associação.
 *
 * A largura é livre de propósito: logo de associação costuma ser deitada, e
 * forçar um quadrado espremeria o desenho. Fixamos a altura e deixamos a
 * largura seguir a proporção do arquivo.
 *
 * Se não houver URL — ou se a imagem falhar ao carregar, o que acontece quando
 * alguém troca o arquivo no bucket e esquece de atualizar o endereço — cai no
 * monograma do caminhão em vez de deixar um espaço vazio ou um ícone quebrado.
 */
export function LogoAssociacao({
  url,
  altura = 40,
  nome,
  monograma,
  className,
}: Props) {
  const [falhou, setFalhou] = useState(false)

  // Uma URL nova merece nova tentativa: sem isto, trocar a logo pela tela de
  // configurações continuaria mostrando o monograma até recarregar a página.
  useEffect(() => setFalhou(false), [url])

  if (monograma || !url || falhou) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0E2A47] to-[#1B4670] shadow-sm",
          className
        )}
        style={{ height: altura, width: altura }}
      >
        <Truck className="text-white" style={{ height: altura * 0.55, width: altura * 0.55 }} />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a logo vem do
    // Storage do Supabase, com domínio configurável pelo próprio admin; o
    // <Image> do Next exigiria cadastrar o host no next.config.
    <img
      src={url}
      alt={nome ?? "Logo da associação"}
      onError={() => setFalhou(true)}
      className={cn("shrink-0 object-contain", className)}
      style={{ height: altura, maxWidth: altura * 3.5 }}
    />
  )
}
