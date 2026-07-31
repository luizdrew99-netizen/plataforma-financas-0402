"use client"

import { useEffect, useState } from "react"
import { UsersRound } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCrm } from "@/components/crm/provedor-crm"
import { atualizarUsuario, listarUsuarios } from "@/lib/crm/queries"
import { formatarData } from "@/lib/crm/format"
import type { CrmPapel, CrmUsuario } from "@/lib/crm/types"

const PAPEIS: { valor: CrmPapel; rotulo: string; descricao: string }[] = [
  { valor: "admin", rotulo: "Administrador", descricao: "Acesso total, edita configurações" },
  { valor: "supervisor", rotulo: "Supervisor", descricao: "Vê tudo, pode excluir registros" },
  { valor: "consultor", rotulo: "Consultor", descricao: "Cria e edita simulações" },
]

export default function PaginaUsuarios() {
  const { usuario: usuarioAtual, ehAdmin } = useCrm()
  const [usuarios, setUsuarios] = useState<CrmUsuario[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarUsuarios()
      .then((lista) => ativo && setUsuarios(lista))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Falha ao carregar.")
      )
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  async function alterar(id: string, patch: Partial<CrmUsuario>) {
    const anterior = usuarios
    setUsuarios((atual) => atual.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    try {
      await atualizarUsuario(id, patch)
      toast.success("Usuário atualizado.")
    } catch (e) {
      setUsuarios(anterior)
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.")
    }
  }

  if (carregando) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Quem entra no CRM pela primeira vez é cadastrado automaticamente. O
          primeiro acesso do sistema vira <strong>administrador</strong>; os
          seguintes entram como <strong>consultor</strong> e precisam ser promovidos
          aqui.
        </AlertDescription>
      </Alert>

      {!ehAdmin && (
        <Alert>
          <AlertDescription>
            Só um administrador pode alterar papéis e desativar acessos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="px-0">
          {usuarios.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <UsersRound className="text-muted-foreground size-8" />
              <p className="font-medium">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                    <TableHead className="w-48">Papel</TableHead>
                    <TableHead className="hidden md:table-cell">Desde</TableHead>
                    <TableHead className="w-24">Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => {
                    const ehVoce = u.id === usuarioAtual?.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nome ?? "—"}
                          {ehVoce && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (você)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden max-w-[240px] truncate text-sm sm:table-cell">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.papel}
                            disabled={!ehAdmin || ehVoce}
                            onValueChange={(v) =>
                              void alterar(u.id, { papel: v as CrmPapel })
                            }
                          >
                            <SelectTrigger className="w-full" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAPEIS.map((p) => (
                                <SelectItem key={p.valor} value={p.valor}>
                                  {p.rotulo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                          {formatarData(u.created_at)}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.ativo}
                            // Desativar a si mesmo tranca o próprio acesso.
                            disabled={!ehAdmin || ehVoce}
                            onCheckedChange={(v) => void alterar(u.id, { ativo: v })}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
