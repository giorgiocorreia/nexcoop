import { INDEX_HTML } from '../content/index-html'
import CoopaibiInteractions from '../CoopaibiInteractions'
import CoopaibiCotacaoStrip from '../CoopaibiCotacaoStrip'

const MARCADOR_COTACAO = '<!-- STATS BAR -->'

// Home fiel da COOPAIBI — porte 1:1 de index.html (Dropbox/.../coopaibi-site).
// Único elemento novo: a faixa de cotação do dia, inserida logo após o hero
// (primeira dobra), no ponto onde o HTML original tem a "STATS BAR".
export default function CoopaibiHome({ orgId }: { orgId: string }) {
  const marcadorIdx = INDEX_HTML.indexOf(MARCADOR_COTACAO)
  const antes = marcadorIdx === -1 ? INDEX_HTML : INDEX_HTML.slice(0, marcadorIdx)
  const depois = marcadorIdx === -1 ? '' : INDEX_HTML.slice(marcadorIdx)

  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="stylesheet" href="/sites/coopaibi/css/index.css" />
      <div dangerouslySetInnerHTML={{ __html: antes }} />
      {depois && <CoopaibiCotacaoStrip orgId={orgId} />}
      {depois && <div dangerouslySetInnerHTML={{ __html: depois }} />}
      <CoopaibiInteractions page="index" slug="coopaibi" />
    </>
  )
}
