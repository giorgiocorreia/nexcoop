import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extrairSlugDoHost } from '@/lib/site/site-utils'

// Domínio raiz do produto — subdomínios diferentes disso (exceto os
// reservados em extrairSlugDoHost: www/app/api) viram site público de org.
const DOMINIO_BASE = 'nexcoop.com.br'

export async function middleware(request: NextRequest) {
  // ── Módulo Site: resolução por Host ──────────────────────────────────
  // Roda ANTES de qualquer coisa de auth — o site público é servido pro
  // visitante anônimo, não deve nem tentar carregar sessão. Só intercepta
  // aqui e devolve early; qualquer host que não seja subdomínio de site
  // (nexcoop.com.br, www.nexcoop.com.br, localhost, previews da Vercel)
  // segue pro fluxo normal do app logo abaixo, sem alteração de
  // comportamento.
  const hostname = (request.headers.get('host') ?? '').split(':')[0]
  const slugSite = extrairSlugDoHost(hostname, DOMINIO_BASE)
  // Atalho de desenvolvimento: em localhost/127.0.0.1, sem precisar editar
  // o arquivo hosts, usar ?siteSlug=coopaibi na URL pra pré-visualizar o
  // site de uma org (ver relatório da tarefa pra instruções completas).
  const slugDev = (hostname === 'localhost' || hostname === '127.0.0.1')
    ? request.nextUrl.searchParams.get('siteSlug')
    : null
  const slug = slugSite ?? slugDev

  // /api/* nunca é reescrito pro namespace do site — as rotas de API já são
  // globais (ex.: app/api/site/[slug]/interesse resolve o slug sozinho a
  // partir do path, não do host) e o form do site chama esse endpoint via
  // fetch relativo no MESMO host coopaibi.nexcoop.com.br. Sem esta exceção,
  // /api/site/coopaibi/interesse viraria /coopaibi/api/site/coopaibi/interesse.
  if (slug && !request.nextUrl.pathname.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = `/${slug}${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }

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
  const isApiSite = pathname.startsWith('/api/site')
  const isFiliadoLogin = pathname.startsWith('/filiado/login')
  const isFiliadoPublic = pathname === '/filiado' || isFiliadoLogin
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/redefinir-senha') || isFiliadoLogin
  const isPublicPage = pathname === '/' || pathname.startsWith('/assinar') || pathname.startsWith('/aceitar-convite') || pathname.startsWith('/link-expirado') || isFiliadoPublic
  const isOnboarding = pathname.startsWith('/onboarding')
  const isRSC = request.headers.get('rsc') === '1'

  // Não autenticado — redireciona para login
  if (!user && !isAuthPage && !isPublicPage && !isApiCron && !isApiWhatsApp && !isApiNfe && !isApiSite) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Já autenticado tentando acessar login
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = isFiliadoLogin ? '/filiado/inicio' : '/dashboard'
    return NextResponse.redirect(url)
  }

  const isFiliadoArea = pathname.startsWith('/filiado')

  // Verifica onboarding apenas em navegação completa (não RSC)
  if (user && !isAuthPage && !isPublicPage && !isOnboarding && !isRSC && !isFiliadoArea) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('organizacao_id, role, ativo')
      .eq('id', user.id)
      .single()

    // toggleAtivo só marca a flag no banco — sem essa checagem, usuário
    // desativado com sessão ainda válida continuava navegando normalmente.
    if (usuario?.ativo === false) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('erro', 'inativo')
      return NextResponse.redirect(url)
    }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|wav|mp3|m4a|ogg)$).*)',
  ],
}