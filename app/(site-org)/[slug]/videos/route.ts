import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaVideos } from '@/lib/site/coopaibi/videos'

// Galeria de Vídeos, lendo `site_conteudos` (tipo 'video', migration 095).
// ?cat= e ?busca= são os mesmos parâmetros do videos.php original, então a
// barra lateral e o formulário de busca continuam funcionando sem tocar no
// HTML capturado.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!temCustomizacao(slug)) return new Response('Não encontrado', { status: 404 })

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) return new Response('Não encontrado', { status: 404 })

  const { searchParams } = new URL(request.url)
  const html = await montarPaginaVideos(config.organizacao_id, {
    cat: searchParams.get('cat') ?? '',
    busca: searchParams.get('busca') ?? '',
    v: searchParams.get('v') ?? '',
  })

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
