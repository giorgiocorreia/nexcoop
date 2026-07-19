import { HOMENS_DE_BARRO_CSS, HOMENS_DE_BARRO_HTML } from '../content/homens-de-barro-html'
import CoopaibiInteractions from '../CoopaibiInteractions'

// Página autoral "Na Casa dos Homens de Barro" (ateliê Cores da Terra, Selma
// Calheira) — visual completamente à parte do resto do site (tema
// terracota/escuro próprio), portada 1:1 com o CSS inline original.
// Sem nav/topbar do site (o original também não tem — página standalone).
export default function CoopaibiHomensDeBarro() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HOMENS_DE_BARRO_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HOMENS_DE_BARRO_HTML }} />
      <CoopaibiInteractions page="homens-de-barro" slug="coopaibi" />
    </>
  )
}
