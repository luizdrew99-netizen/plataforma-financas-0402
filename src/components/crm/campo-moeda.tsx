"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { moedaParaNumero, numeroParaCampoMoeda } from "@/lib/crm/format"

interface CampoMoedaProps {
  id?: string
  rotulo?: string
  valor: number
  onChange: (valor: number) => void
  descricao?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Campo de dinheiro em pt-BR.
 *
 * Enquanto o campo está focado o usuário digita à vontade (inclusive colando
 * "275000.00" de uma planilha); a formatação só entra no blur, senão o cursor
 * pula toda vez que a máscara insere um ponto de milhar.
 */
export function CampoMoeda({
  id,
  rotulo,
  valor,
  onChange,
  descricao,
  placeholder = "0,00",
  disabled,
  className,
}: CampoMoedaProps) {
  const [texto, setTexto] = useState(() => numeroParaCampoMoeda(valor))
  const [focado, setFocado] = useState(false)

  // Mudanças vindas de fora (rateio sugerido, edição carregada do banco)
  // precisam aparecer — mas não podem atropelar quem está digitando.
  useEffect(() => {
    if (!focado) setTexto(numeroParaCampoMoeda(valor))
  }, [valor, focado])

  return (
    <div className={cn("space-y-1.5", className)}>
      {rotulo && <Label htmlFor={id}>{rotulo}</Label>}
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
          R$
        </span>
        <Input
          id={id}
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9 text-right font-medium tabular-nums"
          value={texto}
          onFocus={(e) => {
            setFocado(true)
            e.currentTarget.select()
          }}
          onChange={(e) => {
            setTexto(e.target.value)
            onChange(moedaParaNumero(e.target.value))
          }}
          onBlur={() => {
            setFocado(false)
            const numero = moedaParaNumero(texto)
            setTexto(numeroParaCampoMoeda(numero))
            onChange(numero)
          }}
        />
      </div>
      {descricao && (
        <p className="text-muted-foreground text-xs">{descricao}</p>
      )}
    </div>
  )
}
