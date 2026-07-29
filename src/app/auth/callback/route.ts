import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase-server"

/**
 * Callback do fluxo PKCE. Recebe o `code` do OAuth (Google) ou o `token_hash`
 * dos links de email (confirmação de conta, recuperação de senha) e troca por
 * uma sessão gravada em cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard"

  // Só aceitamos caminhos internos: um `next` absoluto permitiria redirecionar
  // o usuário recém-autenticado para um domínio externo.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  return NextResponse.redirect(
    `${origin}/auth?error=${encodeURIComponent("Link inválido ou expirado")}`
  )
}
