import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaNoticias } from '@/lib/site/coopaibi/noticias'

// Notícias do site da COOPAIBI, lendo `site_conteudos` (tipo 'noticia').
//
// Route Handler devolvendo text/html pelo mesmo motivo das outras páginas
// integradas: o documento traz <script> (ticker do TradingView, menus
// dropdown, Google Translate) e script vindo de dangerouslySetInnerHTML não
// executa.
//
// `?slug=` abre a matéria; sem ele, a lista. É o mesmo parâmetro do site
// original, então os links do ticker e dos cards continuam apontando para
// noticias.php sem tocar no HTML capturado — e link já compartilhado por aí
// continua abrindo a notícia certa.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!temCustomizacao(slug)) {
    return new Response('Não encontrado', { status: 404 })
  }

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) {
    return new Response('Não encontrado', { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const html = await montarPaginaNoticias(
    config.organizacao_id,
    searchParams.get('slug') ?? ''
  )

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
