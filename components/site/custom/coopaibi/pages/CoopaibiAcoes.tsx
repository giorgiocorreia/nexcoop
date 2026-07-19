import { ACOES_HTML } from '../content/acoes-html'
import CoopaibiInteractions from '../CoopaibiInteractions'

export default function CoopaibiAcoes() {
  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="stylesheet" href="/sites/coopaibi/css/acoes.css" />
      <div dangerouslySetInnerHTML={{ __html: ACOES_HTML }} />
      <CoopaibiInteractions page="acoes" slug="coopaibi" />
    </>
  )
}
