import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaHome } from '@/lib/site/coopaibi/home'

// Home do espelho da COOPAIBI, com a faixa de notícias vinda do banco.
//
// Por que /inicio e não a raiz: `app/(site-org)/[slug]/page.tsx` já existe e
// serve o TEMPLATE PADRÃO do módulo Site para as demais organizações. Um
// route.ts não pode coexistir com um page.tsx no mesmo caminho, e derrubar
// o template para acomodar uma org customizada seria trocar o produto pelo
// caso particular. Então a home fiel ganha rota própria, e o middleware
// manda `/` e `/index.php` para cá — o visitante nunca vê esta URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!temCustomizacao(slug)) return new Response('Não encontrado', { status: 404 })

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) return new Response('Não encontrado', { status: 404 })

  return new Response(await montarPaginaHome(config.organizacao_id), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
