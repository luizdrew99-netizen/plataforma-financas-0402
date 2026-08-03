"use client"

/**
 * Contexto do CRM: guarda o usuário logado e os cadastros base (configurações,
 * categorias, coberturas, benefícios) que praticamente toda tela consulta.
 * Carrega uma vez no layout em vez de cada página buscar por conta própria.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  listarBeneficios,
  listarCategorias,
  listarCoberturas,
  obterConfiguracoes,
  obterMeuPerfil,
} from "@/lib/crm/queries"
import type {
  Beneficio,
  Categoria,
  Cobertura,
  Configuracoes,
  Papel,
  Perfil,
} from "@/lib/crm/types"

interface EstadoCrm {
  usuario: Perfil | null
  configuracoes: Configuracoes | null
  categorias: Categoria[]
  coberturas: Cobertura[]
  beneficios: Beneficio[]
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
  /** `true` se o papel do usuário está entre os informados. */
  temPapel: (...papeis: Papel[]) => boolean
  ehAdmin: boolean
}

const ContextoCrm = createContext<EstadoCrm | null>(null)

export function ProvedorCrm({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Perfil | null>(null)
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [coberturas, setCoberturas] = useState<Cobertura[]>([])
  const [beneficios, setBeneficios] = useState<Beneficio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      // O perfil vem primeiro: a RLS de todo o resto depende do papel dele.
      // A linha é criada pelo trigger `handle_new_user` no cadastro.
      setUsuario(await obterMeuPerfil())

      const [cfg, cats, cobs, bens] = await Promise.all([
        obterConfiguracoes(),
        listarCategorias(),
        listarCoberturas(),
        listarBeneficios(),
      ])
      setConfiguracoes(cfg)
      setCategorias(cats)
      setCoberturas(cobs)
      setBeneficios(bens)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o CRM.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const valor = useMemo<EstadoCrm>(
    () => ({
      usuario,
      configuracoes,
      categorias,
      coberturas,
      beneficios,
      carregando,
      erro,
      recarregar: carregar,
      temPapel: (...papeis: Papel[]) =>
        !!usuario && papeis.includes(usuario.papel),
      ehAdmin: usuario?.papel === "admin",
    }),
    [usuario, configuracoes, categorias, coberturas, beneficios, carregando, erro, carregar]
  )

  return <ContextoCrm.Provider value={valor}>{children}</ContextoCrm.Provider>
}

export function useCrm(): EstadoCrm {
  const contexto = useContext(ContextoCrm)
  if (!contexto) {
    throw new Error("useCrm precisa estar dentro de <ProvedorCrm>.")
  }
  return contexto
}
