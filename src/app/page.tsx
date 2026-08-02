import { redirect } from "next/navigation"

/**
 * A raiz do site é o CRM. Quem não estiver logado é mandado para `/auth`
 * pelo guarda de sessão do próprio layout do CRM.
 */
export default function Home() {
  redirect("/crm")
}
