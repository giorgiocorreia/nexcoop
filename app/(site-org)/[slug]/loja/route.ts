import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaLoja } from '@/lib/site/coopaibi/loja'

// Loja do site da COOPAIBI, lendo `loja_produtos` — o mesmo cadastro que o
// PDV e o estoque usam. Encerra a duplicação que o PLANO_MODULO_SITE aponta
// como problema nº 1: o site mantinha MySQL próprio, onde só um produto
// chegou a ser cadastrado, enquanto a Loja opera com 27.
//
// Route Handler devolvendo text/html pelo mesmo motivo da página de cacau:
// o documento traz <script> (ticker do TradingView, menus dropdown, Google
// Translate) e script vindo de dangerouslySetInnerHTML não executa.
//
// Ao contrário das outras páginas do espelho, esta tem ESTADO: ?cat= filtra
// por categoria e ?busca= por nome, exatamente como no site original — os
// links da barra lateral e o formulário de busca continuam apontando para
// loja.php com esses parâmetros, sem precisar tocar no HTML capturado.
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
  const html = await montarPaginaLoja(config.organizacao_id, {
    cat: searchParams.get('cat') ?? '',
    busca: searchParams.get('busca') ?? '',
  })

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Catálogo muda pouco, mas preço e disponibilidade mudam — 5 min é a
      // mesma janela do resto do módulo Site. `vary` em nada: o filtro vem
      // na query string, que já entra na chave de cache do CDN.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
