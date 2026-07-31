"use client"

import { cn } from "@/lib/utils"
import {
  SITUACAO_CADASTRO,
  STATUS_SIMULACAO,
  type SituacaoCadastro,
  type StatusSimulacao,
} from "@/lib/crm/types"

const BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"

export function EtiquetaStatus({
  status,
  className,
}: {
  status: StatusSimulacao
  className?: string
}) {
  const info = STATUS_SIMULACAO[status]
  if (!info) return null
  return <span className={cn(BASE, info.classe, className)}>{info.rotulo}</span>
}

export function EtiquetaSituacao({
  situacao,
  className,
}: {
  situacao: SituacaoCadastro
  className?: string
}) {
  const info = SITUACAO_CADASTRO[situacao]
  if (!info) return null
  return <span className={cn(BASE, info.classe, className)}>{info.rotulo}</span>
}

export function EtiquetaCategoria({
  codigo,
  className,
}: {
  codigo: string | null | undefined
  className?: string
}) {
  if (!codigo) return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        BASE,
        "bg-[#0E2A47] text-white dark:bg-[#1B4670]",
        className
      )}
    >
      {codigo}
    </span>
  )
}
