import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Pegar token dos cookies
  const token = request.cookies.get('sb-access-token')?.value

  // Verificar se está autenticado
  const { data: { user } } = await supabase.auth.getUser(token)

  // Rotas públicas
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  
  // Se não está autenticado e tenta acessar rota protegida
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Se está autenticado e tenta acessar página de auth
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
