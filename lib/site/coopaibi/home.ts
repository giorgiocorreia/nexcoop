import { INDEX_PARTES } from '@/components/site/custom/coopaibi/content/index-partes'
import { buscarNoticiasTicker, montarItensTicker } from './ticker'

// Home do site da COOPAIBI — a última página a deixar de ser HTML congelado.
//
// Ela sempre foi quase estática: o index.php original tinha uma única
// consulta, buscando 8 títulos para a faixa rolante. Todo o resto (hero,
// números do projeto, cotas de parceria, cronograma, ODS) é texto fixo e
// continua vindo da captura fiel.
//
// Fechar esta era o que faltava para nenhuma página do site depender do
// MySQL do cPanel: agora notícia publicada no painel do NexCoop aparece na
// faixa da home sozinha, como já acontece nas outras cinco.
export async function montarPaginaHome(orgId: string): Promise<string> {
  const noticias = await buscarNoticiasTicker(orgId)
  const [p0, p1] = INDEX_PARTES

  // Sem notícia cadastrada a faixa fica vazia — e vazia ela some, porque o
  // CSS anima um container sem conteúdo. É o comportamento que o próprio
  // index.php tinha ao cair no fallback com lista vazia.
  return p0 + montarItensTicker(noticias) + p1
}
