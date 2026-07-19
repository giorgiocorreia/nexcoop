import { PARCEIRO_HTML } from '../content/parceiro-html'
import CoopaibiInteractions from '../CoopaibiInteractions'

export default function CoopaibiParceiro() {
  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="stylesheet" href="/sites/coopaibi/css/parceiro.css" />
      <div dangerouslySetInnerHTML={{ __html: PARCEIRO_HTML }} />
      <CoopaibiInteractions page="parceiro" slug="coopaibi" />
    </>
  )
}
