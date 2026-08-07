import { buscarSiteConfigPorSlug } from '@/lib/site/queries'
import { temCustomizacao } from '@/lib/site/custom'
import { montarPaginaCacau } from '@/lib/site/coopaibi/cacau'

// Compra de Cacau — primeira página do espelho da COOPAIBI a sair do HTML
// congelado e passar a ler dado vivo (tabela `cotacoes`).
//
// Route Handler devolvendo text/html, e não page.tsx devolvendo JSX, por um
// motivo concreto: a página tem seis blocos de <script> (ticker e gráfico do
// TradingView, fetch do preço internacional da bolsa, menus dropdown e
// Google Translate). Script inserido via dangerouslySetInnerHTML não
// executa — regra do navegador para innerHTML —, então a versão em JSX
// derrubaria as cinco funcionalidades e exigiria reimplementar cada uma.
// Devolvendo o documento inteiro, o navegador analisa HTML de verdade e os
// scripts rodam como sempre rodaram, sem reimplementação nenhuma.
//
// Como consequência a página também não passa pelo layout de (site-org),
// que é o certo aqui: o documento capturado já traz seu próprio <head>,
// nav, rodapé e botão de WhatsApp.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // O porte fiel é exclusivo das orgs customizadas (hoje só a COOPAIBI).
  // Outras orgs seguem no template padrão, que não tem esta rota.
  if (!temCustomizacao(slug)) {
    return new Response('Não encontrado', { status: 404 })
  }

  const config = await buscarSiteConfigPorSlug(slug)
  if (!config) {
    return new Response('Não encontrado', { status: 404 })
  }

  const html = await montarPaginaCacau(config.organizacao_id)

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Mesma janela de 5 min do resto do módulo Site (revalidate = 300):
      // cotação é dado vivo, mas não muda de minuto a minuto, e sem cache
      // cada visita bateria no banco.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
