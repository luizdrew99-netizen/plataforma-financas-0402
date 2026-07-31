import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Se não tiver credenciais do Supabase, permite acesso
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  try {
    // Pegar todos os cookies do Supabase (formato: sb-<project-ref>-auth-token)
    const allCookies = request.cookies.getAll()
    const authCookie = allCookies.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    )

    const isAuthenticated = !!authCookie?.value
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

    // Se não está autenticado e tenta acessar dashboard, redireciona para auth
    if (!isAuthenticated && isDashboard) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    console.error("Erro no middleware:", err)
    return NextResponse.next()
  }
}

// `/crm` fica de fora de propósito. Este middleware procura um cookie
// `sb-*-auth-token`, mas o cliente Supabase deste projeto (`createClient`
// puro) guarda a sessão em localStorage e não escreve cookie nenhum — então
// a checagem daria "não autenticado" mesmo com o usuário logado, e o CRM
// nunca abriria. Quem protege o /crm é o guarda de sessão do próprio layout
// (`src/app/crm/layout.tsx`), e o acesso aos dados é barrado pela RLS.
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}
