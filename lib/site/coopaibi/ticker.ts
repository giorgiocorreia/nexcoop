import { buscarConteudosPorTipo } from '@/lib/site/queries'
import type { SiteConteudo } from '@/types/database'

// Faixa de topo rolante, com as notícias da cooperativa.
//
// No site original só a home e a página de Notícias tinham a faixa rolante
// (`ribbon ribbon-ticker`); Loja, Cacau, Ações e Vídeos ficavam com uma
// faixa estática de texto fixo. Padronizar em todas foi decisão do Giorgio
// (07/08) — é melhoria sobre o site publicado, não espelho, e só ficou
// possível quando as notícias passaram a viver em `site_conteudos`.
//
// O CSS que faz rolar (`animation: ticker-scroll 40s linear infinite`) já
// está no style.css espelhado, então nada de estilo precisa mudar: basta a
// faixa sair com as classes e a estrutura que ele espera.

export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Os títulos saem DUPLICADOS de propósito: a animação desliza a faixa em
// -50% da própria largura, então a segunda cópia entra pela direita no
// instante em que a primeira sai pela esquerda. Sem ela o letreiro pisca a
// cada volta.
export function montarItensTicker(noticias: SiteConteudo[]): string {
  const itens = noticias.slice(0, 8)
  if (!itens.length) return ''
  const bloco = itens
    .map(
      (n) => `          <a href="noticias.php?slug=${esc(n.slug ?? '')}" class="ticker-item">
            📰 ${esc(n.titulo)}          </a>
          <span class="ticker-sep">◆</span>`
    )
    .join('\n')
  return '\n' + bloco + '\n' + bloco + '\n      '
}

// Faixa completa, para substituir o `<div class="ribbon">…</div>` estático
// que as páginas internas traziam.
export function montarFaixaTicker(noticias: SiteConteudo[], textoFixo: string): string {
  const itens = montarItensTicker(noticias)

  // Sem notícia cadastrada não há o que rolar — mantém-se a faixa estática
  // original da página, que é melhor do que uma faixa vazia deslizando.
  if (!itens) {
    return `<div class="ribbon">\n    <span>${textoFixo}</span></div>`
  }

  return `<div class="ribbon ribbon-ticker">
    <div class="ticker-track">
      <div class="ticker-inner" id="ticker-inner">${itens}</div>
    </div></div>`
}

export async function buscarNoticiasTicker(orgId: string): Promise<SiteConteudo[]> {
  return buscarConteudosPorTipo(orgId, 'noticia')
}
