import { ACOES_PARTES } from '@/components/site/custom/coopaibi/content/acoes-partes'
import { buscarNoticiasTicker, montarFaixaTicker } from './ticker'

// Ações — a única página que virou rota SEM ter dado próprio a integrar.
//
// `acoes_eventos` está vazia no MySQL e o 8º Festival do AgroChocolate que
// a página mostra é hardcoded no acoes.php: o conteúdo inteiro é estático.
// Ela deixou de ser arquivo servido direto só para ganhar a faixa rolante
// com as notícias, padronizada em todas as páginas.
//
// Se um dia a cooperativa passar a cadastrar eventos, é aqui que
// `site_conteudos` (tipo 'evento') entra.

const FAIXA_FIXA =
  '🍫 COOPAIBI participa do 8º Festival Nacional do AgroChocolate · Ipiaú/BA · 21 a 24 de maio de 2026'

export async function montarPaginaAcoes(orgId: string): Promise<string> {
  const noticias = await buscarNoticiasTicker(orgId)
  const [p0, p1] = ACOES_PARTES
  return p0 + montarFaixaTicker(noticias, FAIXA_FIXA) + p1
}
