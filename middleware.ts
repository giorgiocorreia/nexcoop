import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extrairSlugDoHost } from '@/lib/site/site-utils'
import {
  HOSTS_ESPELHO_COOPAIBI, caminhoDoEspelho, resolverEspelho,
} from '@/lib/site/espelho-coopaibi'

// Domínio raiz do produto — subdomínios diferentes disso (exceto os
// reservados em extrairSlugDoHost: www/app/api) viram site público de org.
const DOMINIO_BASE = 'nexcoop.com.br'

// ── Espelho fiel do site legado da COOPAIBI ────────────────────────────
// Os arquivos em public/sites/coopaibi/ são cópia BYTE A BYTE do site em
// produção no cPanel (Dropbox/.../coopaibi-site). Não editar: a fidelidade
// é verificável por sha256 contra a origem. Tudo que o site precisa e que
// não é arquivo estático é resolvido sem tocar no HTML.
//
// Os mapas de rota e a decisão de para onde vai cada caminho moram em
// lib/site/espelho-coopaibi.ts — é o código que decide cada URL do site no
// momento em que o DNS virar, e lá ele tem teste (espelho-coopaibi.test.ts).
// Aqui fica só o efeito colateral: rewrite, redirect, clone de URL.
//
// coopaibi-site.vercel.app é o endereço de trabalho — é por ele que o site
// é conferido enquanto o DNS não vira. A checagem precisa vir ANTES de
// extrairSlugDoHost, que casa o padrão <slug>-site.vercel.app e mandaria
// esse host pro template React em app/(site-org)/[slug] (o porte de 19/07,
// que segue no repositório como matéria-prima da integração, mas não é mais
// o que se publica).
//
// O encaminhamento para o cPanel (LEGADO_COOPAIBI, PHP_NAVEGACAO_COOPAIBI,
// PHP_ENDPOINT_COOPAIBI) foi removido em 08/08/2026: apontava para o próprio
// coopaibi.com.br e viraria um laço Vercel→Vercel depois da virada. Se algum
// dia for preciso encaminhar de novo, o destino tem que ser um host que NÃO
// seja o domínio principal (ex.: antigo.coopaibi.com.br).
//
// Nota sobre `translate.php`: era código morto e nunca precisou de proxy. A
// tradução do site passou a ser o Google Translate Element (cookie googtrans,
// função traduzirPara); a função antiga que o chamava — selecionarIdioma —
// não é acionada por nenhum onclick das páginas atuais. Sete páginas ainda
// trazem o fetch no fonte, e nenhuma o executa.

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
  const caminhoEspelho = caminhoDoEspelho(hostname, request.nextUrl.pathname)

  if (caminhoEspelho !== null) {
    // A escolha do destino (e a ordem de precedência entre endpoint, link
    // externo, página integrada e página congelada) está em
    // lib/site/espelho-coopaibi.ts, sob teste. Aqui só se executa.
    const destino = resolverEspelho(caminhoEspelho, ehHostEspelho)

    if (destino.acao === 'redirect') {
      return NextResponse.redirect(destino.url, destino.status)
    }
    if (destino.acao === 'rewrite') {
      const url = request.nextUrl.clone()
      url.pathname = destino.pathname
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
    if (isFiliadoLogin) {
      url.pathname = '/filiado/inicio'
    } else {
      // Parceiro contábil (sem home na org) → portal do escritório
      const { data: profLogin } = await supabase
        .from('profissionais_parceiros')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .maybeSingle()
      url.pathname = profLogin ? '/escritorio' : '/dashboard'
    }
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

  // Redireciona usuário operacional / parceiro para o módulo correto
  if (user && pathname === '/dashboard' && !isRSC) {
    const { data: usuarioFuncoes } = await supabase
      .from('usuarios')
      .select('funcoes, role')
      .eq('id', user.id)
      .maybeSingle()

    // Contador externo: não usa o dashboard da cooperativa
    if (!usuarioFuncoes) {
      const { data: profDash } = await supabase
        .from('profissionais_parceiros')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .maybeSingle()
      if (profDash) {
        const url = request.nextUrl.clone()
        // Dentro do módulo contábil da org cliente → home contábil
        // Fora (só escritório) → painel do parceiro
        url.pathname = request.cookies.get('parceiro_org_id')?.value
          ? '/contabil/plano-de-contas'
          : '/escritorio'
        return NextResponse.redirect(url)
      }
    }

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

  // Parceiro acessando org: bloquear rotas da cooperativa fora do escopo contábil/financeiro/fiscal
  if (user && !isRSC && request.cookies.get('parceiro_org_id')?.value) {
    const { data: usuarioRow } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!usuarioRow) {
      const bloqueadas = [
        '/dashboard',
        '/cooperados',
        '/assembleias',
        '/documentos',
        '/configuracoes',
        '/mensalidades',
        '/producao',
        '/captacao',
        '/loja',
        '/admin',
      ]
      const bloqueada = bloqueadas.some(
        (p) => pathname === p || pathname.startsWith(p + '/'),
      )
      // Comercialização: só fiscal se tiver flag (gate fino nas páginas); resto bloqueia
      const comBloqueada =
        pathname.startsWith('/comercializacao') &&
        !pathname.startsWith('/comercializacao/fiscal')
      if (bloqueada || comBloqueada) {
        const url = request.nextUrl.clone()
        url.pathname = '/contabil/plano-de-contas'
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