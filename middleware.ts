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
// coopaibi-site.vercel.app é o endereço de trabalho — é por ele que o site
// é conferido enquanto o DNS não vira. Precisa vir ANTES de
// extrairSlugDoHost, que casa o padrão <slug>-site.vercel.app e mandaria
// esse host pro template React em app/(site-org)/[slug] (o porte de 19/07,
// que segue no repositório como matéria-prima da integração, mas não é mais
// o que se publica).
const HOSTS_ESPELHO_COOPAIBI = new Set([
  'coopaibi.com.br',
  'www.coopaibi.com.br',
  'coopaibi-site.vercel.app',
])
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

// Páginas .php JÁ REFEITAS aqui — mapeiam pro arquivo estático equivalente
// em public/sites/coopaibi/. O site original é PHP, então os links internos
// apontam pra .php; refazer uma página é gerar o .html e mover a entrada
// daqui de PHP_NAVEGACAO_COOPAIBI (abaixo) pra este mapa.
//
// index.php foi gerado por scripts/espelho-coopaibi/gerar-index.mjs a partir
// do index.php original + o conteúdo do ticker de notícias, e conferido byte
// a byte contra o que o cPanel serve.
// Vazio hoje — todas as páginas passaram para PHP_INTEGRADAS_COOPAIBI. O
// mapa fica porque é a parada intermediária natural: ao portar uma página
// nova, congelar primeiro e integrar depois separa "o HTML está fiel?" de
// "o dado está certo?", que são dois problemas diferentes.
const PHP_REFEITAS_COOPAIBI: Record<string, string> = {
  // Biblioteca — página fora do menu, criada para ter um link a enviar com
  // o PDF do Projeto Cacau que Refloresta. Continua congelada porque a
  // tabela `biblioteca` tem 2 linhas para o MESMO arquivo (cadastro
  // duplicado) e nada além dele: integrar não traria nada.
  //
  // O filtro por categoria (?cat=) deixa de filtrar — serve sempre a mesma
  // página. Com um documento só, não muda o que a pessoa vê.
  'biblioteca.php': 'biblioteca.html',
}

// Páginas .php JÁ INTEGRADAS ao banco do NexCoop — vão para uma rota do
// app, que devolve o mesmo HTML do site com os números vindos do Supabase.
// É o destino de todas: o mapa acima (HTML congelado) é a parada
// intermediária, este é a chegada.
const PHP_INTEGRADAS_COOPAIBI: Record<string, string> = {
  // A home sempre foi quase estática — o index.php tinha uma consulta só,
  // buscando 8 títulos para a faixa. Rota separada (/inicio) porque
  // app/(site-org)/[slug]/page.tsx já serve o TEMPLATE PADRÃO das demais
  // orgs, e route.ts não coexiste com page.tsx no mesmo caminho.
  'index.php': 'inicio',
  // Preço do cacau sai de `cotacoes` em vez do cadastro próprio do site,
  // que ficou parado em 24/05/2026 com R$ 14,00/kg enquanto a cooperativa
  // já pagava R$ 18,66.
  'cacau.php': 'cacau',
  // Catálogo sai de `loja_produtos`, o mesmo cadastro do PDV e do estoque.
  // O site tinha MySQL próprio, com um único produto cadastrado à mão,
  // enquanto a Loja opera com 27.
  'loja.php': 'loja',
  // Notícias saem de `site_conteudos` (tipo 'noticia', migration 095). O
  // ?slug= continua sendo o mesmo parâmetro do site original, para não
  // quebrar link já compartilhado.
  'noticias.php': 'noticias',
  // Galeria sai de `site_conteudos` (tipo 'video'), com o youtube_id que a
  // 095 trouxe. ?cat= e ?busca= seguem sendo os parâmetros originais.
  'videos.php': 'videos',
  // Ações é a única sem dado próprio a integrar: `acoes_eventos` está VAZIA
  // no MySQL e o 8º Festival que a página mostra é hardcoded no acoes.php.
  // Virou rota mesmo assim, só para ganhar a faixa rolante de notícias que
  // agora vale em todas as páginas. Se um dia a cooperativa cadastrar
  // eventos, é `site_conteudos` tipo 'evento' que entra aqui.
  'acoes.php': 'acoes',
}

// Páginas PHP que continuam no cPanel — o visitante é redirecionado para lá.
// Conforme cada uma for refeita, sai daqui e entra num dos mapas acima.
const PHP_NAVEGACAO_COOPAIBI = new Set<string>([])

// Páginas .php que apontam para FORA do site — hoje só o admin antigo.
//
// O link "INTRANET" do menu ia para o painel PHP do cPanel, onde se
// cadastrava produto, preço e notícia. Esse cadastro passou todo para o
// NexCoop, então o link certo é o painel do NexCoop. Mandar para o cPanel
// depois da virada seria um laço, e antes dela seria mandar a pessoa para
// um admin que não alimenta mais nada.
const PHP_EXTERNO_COOPAIBI: Record<string, string> = {
  'admin/login.php': 'https://nexcoop.com.br/login',
}

// Endpoints chamados por fetch() de dentro do HTML — precisam de rewrite
// (proxy), não redirect: 307/308 preservariam o método, mas o fetch é
// same-origin relativo e um redirect cross-origin acrescentaria pré-flight
// CORS sem necessidade. Com proxy os formulários de cooperado/parceria e o
// tradutor PT/EN continuam funcionando exatamente como hoje.
// Endpoints .php JÁ REIMPLEMENTADOS aqui — mapeiam para uma rota do app.
// A URL .php é preservada porque é o que o HTML capturado chama; trocar
// exigiria editar as páginas.
//
// Antes da virada de DNS eles eram proxy para o cPanel. Como a hospedagem
// vai ficar só com o e-mail, tudo que não for e-mail tinha que sair de lá:
// no instante em que o domínio apontar para a Vercel, um proxy para
// coopaibi.com.br vira laço.
const PHP_ENDPOINT_INTERNO_COOPAIBI: Record<string, string> = {
  // Formulários: além de enviar o e-mail como o PHP fazia, gravam o lead em
  // `site_leads` (migration 096). No cPanel o interessado virava mensagem
  // na caixa de entrada e morria ali.
  'enviar-cooperado.php': 'enviar/cooperado',
  'enviar-parceria.php': 'enviar/parceria',
  'enviar-agendamento-cacau.php': 'enviar/agendamento-cacau',
  // Preço internacional do cacau (CC=F), com a mesma resposta JSON do PHP.
  'cacau-preco-bolsa.php': 'cacau-bolsa',
}

// Endpoints que continuam no cPanel via proxy.
//
// `translate.php` NÃO está aqui: é código morto. A tradução do site passou a
// ser o Google Translate Element (cookie googtrans, função traduzirPara);
// a função antiga que chamava translate.php — selecionarIdioma — não é
// chamada por nenhum onclick das páginas atuais. Sete páginas ainda trazem
// o fetch no fonte, e nenhuma o executa.
const PHP_ENDPOINT_COOPAIBI = new Set<string>([])

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
    // Endpoints .php reimplementados aqui: viram rota do app. Rewrite (e não
    // redirect) porque são POST de formulário — um redirect trocaria o
    // método ou exigiria pré-flight CORS à toa.
    const endpointInterno = PHP_ENDPOINT_INTERNO_COOPAIBI[caminhoEspelho]
    if (endpointInterno) {
      const url = request.nextUrl.clone()
      url.pathname = `/coopaibi/${endpointInterno}`
      return NextResponse.rewrite(url)
    }

    // Páginas que apontam para fora — hoje só a Intranet, que virou o
    // painel do NexCoop.
    const externo = PHP_EXTERNO_COOPAIBI[caminhoEspelho]
    if (externo) {
      return NextResponse.redirect(externo, 307)
    }
    // Endpoints PHP que restaram no cPanel: proxy, preservando método e
    // corpo. Vazio hoje — ver PHP_ENDPOINT_COOPAIBI.
    if (PHP_ENDPOINT_COOPAIBI.has(caminhoEspelho)) {
      return NextResponse.rewrite(new URL(`/${caminhoEspelho}`, LEGADO_COOPAIBI))
    }
    // Páginas PHP ainda não refeitas: manda o visitante pro site antigo (307
    // preserva método e não fica em cache de navegador, o que importa porque
    // estas rotas vão deixar de redirecionar conforme a integração avançar).
    if (PHP_NAVEGACAO_COOPAIBI.has(caminhoEspelho)) {
      return NextResponse.redirect(new URL(`/${caminhoEspelho}`, LEGADO_COOPAIBI), 307)
    }
    // Páginas .php já integradas ao banco: vão para a rota do app, que
    // devolve o HTML com o dado vivo. Precisa vir ANTES das refeitas — uma
    // página integrada não tem mais .html congelado a servir.
    const integrada = PHP_INTEGRADAS_COOPAIBI[caminhoEspelho]
    if (integrada) {
      const url = request.nextUrl.clone()
      url.pathname = `/coopaibi/${integrada}`
      return NextResponse.rewrite(url)
    }

    // Páginas .php já refeitas: servem o .html equivalente, mantendo a URL
    // .php que os links internos do site original usam. Vale nas duas portas
    // de entrada — inclusive no acesso direto por /sites/coopaibi/index.php.
    const refeita = PHP_REFEITAS_COOPAIBI[caminhoEspelho]
    if (refeita) {
      const url = request.nextUrl.clone()
      url.pathname = `${RAIZ_ESPELHO_COOPAIBI}/${refeita}`
      return NextResponse.rewrite(url)
    }

    // No domínio próprio, mapeia pro arquivo estático correspondente. A raiz
    // ("/") vai pra mesma rota que index.php — é a home, e servir a raiz de
    // um arquivo congelado enquanto /index.php lê do banco deixaria as duas
    // portas da mesma página fora de sincronia. Os demais caminhos resolvem
    // sozinhos porque a URL do navegador continua na raiz do site.
    if (ehHostEspelho) {
      const url = request.nextUrl.clone()
      url.pathname = caminhoEspelho === ''
        ? `/coopaibi/${PHP_INTEGRADAS_COOPAIBI['index.php']}`
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

    // Contador externo: não tem linha em usuarios — home é /escritorio
    if (!usuarioFuncoes) {
      const { data: profDash } = await supabase
        .from('profissionais_parceiros')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .maybeSingle()
      if (profDash) {
        const url = request.nextUrl.clone()
        url.pathname = '/escritorio'
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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|wav|mp3|m4a|ogg)$).*)',
  ],
}