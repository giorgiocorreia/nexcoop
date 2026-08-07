import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extrairSlugDoHost } from '@/lib/site/site-utils'

// Domínio raiz do produto — subdomínios diferentes disso (exceto os
// reservados em extrairSlugDoHost: www/app/api) viram site público de org.
const DOMINIO_BASE = 'nexcoop.com.br'

// ── Espelho fiel do site legado da COOPAIBI ────────────────────────────
// Os arquivos em public/sites/coopaibi/ são cópia BYTE A BYTE do site em
// produção no cPanel (Dropbox/.../coopaibi-site). Não editar: a fidelidade
// é verificável por sha256 contra a origem. Tudo que o site precisa e que
// não é arquivo estático é resolvido aqui, sem tocar no HTML.
const HOSTS_ESPELHO_COOPAIBI = new Set(['coopaibi.com.br', 'www.coopaibi.com.br'])
const RAIZ_ESPELHO_COOPAIBI = '/sites/coopaibi'

// Host do site antigo em cPanel, que segue servindo as 3 páginas dinâmicas
// (dependem do MySQL coopaibi_loja, que não existe aqui) e os endpoints PHP.
//
// ⚠ TROCAR ANTES DE VIRAR O DNS: hoje aponta pro próprio coopaibi.com.br,
// que ainda resolve pro cPanel. No momento em que o domínio passar pra
// Vercel isto vira um laço (Vercel → Vercel). Antes da virada, apontar pra
// um host que continue no cPanel (ex.: antigo.coopaibi.com.br) ou concluir
// a integração destas rotas com o NexCoop e remover o encaminhamento.
const LEGADO_COOPAIBI = 'https://coopaibi.com.br'

// Páginas PHP navegáveis — o visitante vai pro site antigo e vê o conteúdo
// real (produtos, vídeos, eventos vindos do MySQL).
const PHP_NAVEGACAO_COOPAIBI = new Set(['loja.php', 'videos.php', 'acoes.php', 'admin/login.php'])

// Endpoints chamados por fetch() de dentro do HTML — precisam de rewrite
// (proxy), não redirect: 307/308 preservariam o método, mas o fetch é
// same-origin relativo e um redirect cross-origin acrescentaria pré-flight
// CORS sem necessidade. Com proxy os formulários de cooperado/parceria e o
// tradutor PT/EN continuam funcionando exatamente como hoje.
const PHP_ENDPOINT_COOPAIBI = new Set(['enviar-cooperado.php', 'enviar-parceria.php', 'translate.php'])

export async function middleware(request: NextRequest) {
  // ── Módulo Site: resolução por Host ──────────────────────────────────
  // Roda ANTES de qualquer coisa de auth — o site público é servido pro
  // visitante anônimo, não deve nem tentar carregar sessão. Só intercepta
  // aqui e devolve early; qualquer host que não seja subdomínio de site
  // (nexcoop.com.br, www.nexcoop.com.br, localhost, previews da Vercel)
  // segue pro fluxo normal do app logo abaixo, sem alteração de
  // comportamento.
  const hostname = (request.headers.get('host') ?? '').split(':')[0]

  // ── Espelho fiel da COOPAIBI ──────────────────────────────────────────
  // Roda antes de tudo (inclusive do rewrite por slug e do gate de auth).
  // Duas portas de entrada pro mesmo espelho:
  //   1. o domínio próprio (coopaibi.com.br/...) — quando o DNS virar;
  //   2. o caminho direto (/sites/coopaibi/...) — usável desde já, sem DNS.
  // `caminhoEspelho` é o caminho RELATIVO à raiz do site, que é como o HTML
  // original referencia tudo ("assets/style.css", "loja.php", "index.html").
  const ehHostEspelho = HOSTS_ESPELHO_COOPAIBI.has(hostname)
  const caminhoEspelho = ehHostEspelho
    ? request.nextUrl.pathname.replace(/^\/+/, '')
    : request.nextUrl.pathname.startsWith(`${RAIZ_ESPELHO_COOPAIBI}/`)
      ? request.nextUrl.pathname.slice(RAIZ_ESPELHO_COOPAIBI.length + 1)
      : null

  if (caminhoEspelho !== null) {
    // Endpoints PHP: proxy pro cPanel, preservando método e corpo.
    if (PHP_ENDPOINT_COOPAIBI.has(caminhoEspelho)) {
      return NextResponse.rewrite(new URL(`/${caminhoEspelho}`, LEGADO_COOPAIBI))
    }
    // Páginas PHP: manda o visitante pro site antigo (307 preserva método e
    // não fica em cache de navegador, o que importa porque estas rotas vão
    // deixar de redirecionar conforme a integração avançar).
    if (PHP_NAVEGACAO_COOPAIBI.has(caminhoEspelho)) {
      return NextResponse.redirect(new URL(`/${caminhoEspelho}`, LEGADO_COOPAIBI), 307)
    }
    // No domínio próprio, mapeia pro arquivo estático correspondente. A raiz
    // ("/") serve o index.html, e os caminhos relativos do HTML resolvem
    // sozinhos porque a URL do navegador continua na raiz do site.
    if (ehHostEspelho) {
      const url = request.nextUrl.clone()
      url.pathname = caminhoEspelho === ''
        ? `${RAIZ_ESPELHO_COOPAIBI}/index.html`
        : `${RAIZ_ESPELHO_COOPAIBI}/${caminhoEspelho}`
      return NextResponse.rewrite(url)
    }
    // Acesso direto por /sites/coopaibi/* — o arquivo estático já está no
    // caminho pedido; segue sem auth (é conteúdo público).
    return NextResponse.next()
  }

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
  //
  // /sites/* também é excluído — é onde ficam os assets estáticos do porte
  // fiel da COOPAIBI (public/sites/coopaibi/css, .../img — ver
  // components/site/custom/coopaibi/pages/*). Sem esta exceção, um visitante
  // em coopaibi.nexcoop.com.br pedindo /sites/coopaibi/css/style.css seria
  // reescrito pra /coopaibi/sites/coopaibi/css/style.css (404, quebra o
  // layout inteiro). .css/.js já não têm extensão isenta no matcher deste
  // middleware (diferente de imagens, que o matcher já pula por completo).
  // /v/* (verificação pública da carteirinha do filiado, migration 089)
  // também é excluído do rewrite — é rota GLOBAL fora do grupo (site-org)
  // porque o layout de (site-org)/[slug] dá notFound() em org sem
  // site_config, o que quebraria o QR code de qualquer org sem site próprio.
  // Sem esta exceção, coopaibi.nexcoop.com.br/v/ABC123 viraria
  // /coopaibi/v/ABC123 e cairia (incorretamente) na página do site da org.
  if (slug && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/sites/') && !request.nextUrl.pathname.startsWith('/v/')) {
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
  // Verificação pública da carteirinha (/v/{codigo}, migration 089) — quem
  // escaneia o QR é um visitante anônimo (porteiro, fiscal, comerciante),
  // nunca vai ter sessão logada. Sem isto, o gate de auth abaixo redireciona
  // pro /login antes mesmo de a página consultar o banco.
  const isVerificacaoCarteirinha = pathname.startsWith('/v/')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/redefinir-senha') || isFiliadoLogin
  // /sites/* é sempre público (assets estáticos do site institucional — ver
  // nota acima) — sem isto, pedir o asset direto em localhost/dev (sem
  // ?siteSlug, que só a navegação de página propaga, não os <link>/<img> do
  // HTML) cai no redirect de auth como qualquer rota interna.
  const isPublicPage = pathname === '/' || pathname.startsWith('/assinar') || pathname.startsWith('/aceitar-convite') || pathname.startsWith('/link-expirado') || pathname.startsWith('/sites/') || isFiliadoPublic || isVerificacaoCarteirinha
  const isOnboarding = pathname.startsWith('/onboarding')
  // Navegação client-side (Link/router) manda RSC — evita queries extras no middleware
  // e deixa a troca de página mais rápida após clique no menu.
  const isRSC =
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.has('next-router-state-tree')

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
        .select('onboarding_concluido, modulos_ativos, tipo')
        .eq('id', usuario.organizacao_id)
        .single()

      if (org && !org.onboarding_concluido) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      // Bloqueio por módulo. /loja é gate pré-existente para todos os tipos.
      // comercializacao/contabil/captacao só são bloqueados em ASSOCIAÇÃO —
      // cooperativa/central nunca perdem acesso por dado de módulo incompleto
      // (regra: não quebrar cooperativa).
      const ROTAS_POR_MODULO: Record<string, string> =
        org?.tipo === 'associacao'
          ? { '/comercializacao': 'comercializacao', '/loja': 'loja', '/contabil': 'contabil', '/captacao': 'captacao' }
          : { '/loja': 'loja' }
      for (const [prefixo, modulo] of Object.entries(ROTAS_POR_MODULO)) {
        if (pathname.startsWith(prefixo) && !org?.modulos_ativos?.includes(modulo)) {
          return NextResponse.redirect(new URL('/dashboard?modulo_inativo=true', request.url))
        }
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