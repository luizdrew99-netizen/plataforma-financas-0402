"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FileText,
  FilePlus2,
  Files,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Truck,
  Users,
  UsersRound,
  BarChart3,
  ShieldCheck,
  Paperclip,
  History,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { iniciais } from "@/lib/crm/format"
import { LogoAssociacao } from "./logo-associacao"
import { useCrm } from "./provedor-crm"

const ITENS_PRINCIPAIS = [
  { titulo: "Dashboard", url: "/crm", icone: LayoutDashboard, exato: true },
  { titulo: "Nova Simulação", url: "/crm/simulacoes/nova", icone: FilePlus2 },
  { titulo: "Simulações", url: "/crm/simulacoes", icone: FileText },
] as const

const ITENS_CARTEIRA = [
  { titulo: "Clientes", url: "/crm/clientes", icone: Users },
  { titulo: "Veículos", url: "/crm/veiculos", icone: Truck },
  { titulo: "Contratos", url: "/crm/contratos", icone: ShieldCheck },
] as const

const ITENS_APOIO = [
  { titulo: "PDFs Gerados", url: "/crm/pdfs", icone: Files },
  { titulo: "Documentos", url: "/crm/documentos", icone: Paperclip },
  { titulo: "Relatórios", url: "/crm/relatorios", icone: BarChart3 },
] as const

const ITENS_ADMIN = [
  { titulo: "Configurações", url: "/crm/configuracoes", icone: Settings },
  { titulo: "Usuários", url: "/crm/usuarios", icone: UsersRound },
  { titulo: "Auditoria", url: "/crm/auditoria", icone: History },
] as const

export function BarraLateralCrm() {
  const caminho = usePathname()
  const router = useRouter()
  const { usuario, configuracoes } = useCrm()
  const { theme, setTheme } = useTheme()

  const ativo = (url: string, exato?: boolean) =>
    exato ? caminho === url : caminho === url || caminho.startsWith(`${url}/`)

  async function sair() {
    await supabase.auth.signOut()
    router.replace("/auth")
  }

  const grupos = [
    { rotulo: "Operação", itens: ITENS_PRINCIPAIS },
    { rotulo: "Carteira", itens: ITENS_CARTEIRA },
    { rotulo: "Documentos", itens: ITENS_APOIO },
    { rotulo: "Administração", itens: ITENS_ADMIN },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Recolhida, a barra tem 3rem de largura: a logo encolhe para caber no
            lugar do ícone. Aberta, ela ganha uma faixa própria acima do nome —
            é o primeiro elemento da tela e merece o espaço. */}
        <div className="flex flex-col gap-2 px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1">
          <div className="flex justify-center group-data-[collapsible=icon]:hidden">
            <LogoAssociacao
              url={configuracoes?.logo_url}
              urlEscura={configuracoes?.logo_url_escura}
              nome={configuracoes?.nome_associacao}
              altura={64}
            />
          </div>
          <div className="hidden justify-center group-data-[collapsible=icon]:flex">
            <LogoAssociacao monograma altura={28} />
          </div>
          <div className="min-w-0 text-center group-data-[collapsible=icon]:hidden">
            {/* A logo quase sempre já traz o nome escrito; repeti-lo aqui só
                rendia uma linha cortada com reticências. */}
            {!configuracoes?.logo_url && (
              <p className="truncate text-sm font-semibold leading-tight">
                {configuracoes?.nome_associacao ?? "Proteção Veicular"}
              </p>
            )}
            <p className="text-muted-foreground truncate text-[11px] leading-tight">
              CRM de simulações
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.rotulo}>
            <SidebarGroupLabel>{grupo.rotulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={ativo(item.url, "exato" in item ? item.exato : false)}
                      tooltip={item.titulo}
                    >
                      <Link href={item.url}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={usuario?.nome ?? "Conta"}
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-[#0E2A47] text-xs text-white">
                      {iniciais(usuario?.nome ?? usuario?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {usuario?.nome ?? "Usuário"}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px] capitalize">
                      {usuario?.papel ?? "—"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{usuario?.nome ?? "Usuário"}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {usuario?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  {theme === "dark" ? "Tema claro" : "Tema escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={sair} variant="destructive">
                  <LogOut />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
