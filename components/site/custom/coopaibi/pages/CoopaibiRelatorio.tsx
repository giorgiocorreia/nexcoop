import { RELATORIO_HTML } from '../content/relatorio-html'
import { RELATORIO_CSS } from '../content/relatorio-html-css'
import CoopaibiInteractions from '../CoopaibiInteractions'

// Relatório de Compradores Mundiais de Cacau — página fiel, com CSS próprio
// (inline no original) preservado como <style> embutido, igual ao source.
export default function CoopaibiRelatorio() {
  return (
    <>
      <link rel="stylesheet" href="/sites/coopaibi/css/style.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: RELATORIO_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: RELATORIO_HTML }} />
      <CoopaibiInteractions page="relatorio" slug="coopaibi" />
    </>
  )
}
