import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaAcoes } from '@/lib/site/coopaibi/acoes'

// Ações — conteúdo é hardcoded no acoes.php original (a tabela
// `acoes_eventos` está vazia no MySQL), então esta rota existe só para a
// página ganhar a faixa rolante com as notícias, padronizada em todas.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!temCustomizacao(slug)) return new Response('Não encontrado', { status: 404 })

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) return new Response('Não encontrado', { status: 404 })

  return new Response(await montarPaginaAcoes(config.organizacao_id), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
