import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isApiCron = pathname.startsWith('/api/cron')
  const isApiWhatsApp = pathname.startsWith('/api/whatsapp')
  const isApiNfe = pathname.startsWith('/api/nfe')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/redefinir-senha')
  const isPublicPage = pathname === '/' || pathname.startsWith('/assinar') || pathname.startsWith('/aceitar-convite') || pathname.startsWith('/link-expirado')
  const isOnboarding = pathname.startsWith('/onboarding')
  const isRSC = request.headers.get('rsc') === '1'

  // Não autenticado — redireciona para login
  if (!user && !isAuthPage && !isPublicPage && !isApiCron && !isApiWhatsApp && !isApiNfe) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Já autenticado tentando acessar login
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Verifica onboarding apenas em navegação completa (não RSC)
  if (user && !isAuthPage && !isPublicPage && !isOnboarding && !isRSC) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('organizacao_id, role')
      .eq('id', user.id)
      .single()

    if (usuario?.role !== 'super_admin' && usuario?.organizacao_id) {
      const { data: org } = await supabase
        .from('organizacoes')
        .select('onboarding_concluido, modulos_ativos')
        .eq('id', usuario.organizacao_id)
        .single()

      if (org && !org.onboarding_concluido) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/loja') && !org?.modulos_ativos?.includes('loja')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // Redireciona usuário operacional para o módulo correto
  if (user && pathname === '/dashboard' && !isRSC) {
    const { data: usuarioFuncoes } = await supabase
      .from('usuarios')
      .select('funcoes, role')
      .eq('id', user.id)
      .maybeSingle()

    const funcoes: string[] = usuarioFuncoes?.funcoes ?? []
    const role = usuarioFuncoes?.role ?? ''

    if (role !== 'super_admin' && !funcoes.includes('admin')) {
      if (funcoes.includes('caixa_cacau')) {
        const url = request.nextUrl.clone()
        url.pathname = '/comercializacao'
        return NextResponse.redirect(url)
      }
      if (funcoes.includes('caixa_loja') || funcoes.includes('gerente_loja') || funcoes.includes('estoquista_loja')) {
        const url = request.nextUrl.clone()
        url.pathname = '/loja'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}