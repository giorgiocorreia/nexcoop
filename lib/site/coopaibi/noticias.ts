import { buscarConteudosPorTipo, buscarConteudoPorSlug } from '@/lib/site/queries'
import { NOTICIAS_PARTES } from '@/components/site/custom/coopaibi/content/noticias-partes'
import type { SiteConteudo } from '@/types/database'

// Notícias do site da COOPAIBI, lendo `site_conteudos` (tipo 'noticia').
//
// A página tem dois modos, como no site original: lista (padrão) e matéria
// aberta (?slug=). A casca — <head>, navbar, rodapé, tradutor, scripts — é
// captura fiel; só a área de conteúdo e a faixa do ticker são geradas.

export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Data no fuso da cooperativa: a Vercel roda em UTC e uma notícia publicada
// à noite apareceria com a data do dia seguinte.
function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Bahia',
  })
}

function corta(texto: string, limite: number): string {
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto
}

// Faixa rolante: os títulos saem duplicados de propósito — é assim que o
// laço do CSS (`animation: ticker-scroll`) emenda sem salto visível.
export function montarTicker(noticias: SiteConteudo[]): string {
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

function areaMateria(n: SiteConteudo): string {
  const imagem = n.imagem_url
    ? `        <img src="${esc(n.imagem_url)}" alt="${esc(n.titulo)}" />`
    : ''
  const resumo = n.descricao
    ? `        <p class="noticia-resumo">
          ${esc(n.descricao)}
        </p>`
    : ''
  // `conteudo` é HTML vindo do cadastro e vai sem escapar — é o corpo
  // formatado da matéria, mesmo comportamento do site original. Quem edita
  // é a própria cooperativa pelo painel, não visitante.
  return `  <div class="noticia-single">
    <div class="container">
      <div class="noticia-breadcrumb">
        <a href="noticias.php">Notícias</a> ›
        <span>${esc(corta(n.titulo, 60))}</span>
      </div>
      <div class="noticia-capa">
${imagem}
      </div>
      <div class="noticia-corpo">
        <div class="noticia-meta">
          ${dataBR(n.criado_em)}
        </div>
        <h1 class="noticia-titulo">
          ${esc(n.titulo)}
        </h1>
${resumo}
        <div class="noticia-texto">
          ${n.conteudo ?? ''}
        </div>
      </div>
      <div style="text-align:center;margin:32px 0 8px">
        <a href="noticias.php" class="noticia-link-btn">← Voltar para as notícias</a>
      </div>
    </div>
  </div>
`
}

function cardDestaque(n: SiteConteudo): string {
  const img = n.imagem_url
    ? `<img src="${esc(n.imagem_url)}" alt="${esc(n.titulo)}" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:56px">📰</div>`
  return `        <!-- Card destaque -->
        <a href="noticias.php?slug=${esc(n.slug ?? '')}" class="noticia-destaque-card">
          <div class="noticia-destaque-img">
            ${img}
          </div>
          <div class="noticia-destaque-body">
            <span class="sec-tag">⭐ Destaque</span>
            <h2>${esc(n.titulo)}</h2>
            <p>${esc(corta(n.descricao ?? '', 200))}</p>
            <span class="noticia-link-btn">Ler notícia completa →</span>
          </div>
        </a>
`
}

function cardSimples(n: SiteConteudo): string {
  const estiloImg = n.imagem_url
    ? 'padding:0;height:160px;overflow:hidden'
    : 'background:#e8f5e9;display:flex;align-items:center;justify-content:center;height:160px;font-size:40px'
  const conteudoImg = n.imagem_url
    ? `<img src="${esc(n.imagem_url)}" alt="${esc(n.titulo)}" style="width:100%;height:100%;object-fit:cover" />`
    : '📰'
  return `          <a href="noticias.php?slug=${esc(n.slug ?? '')}" class="noticia-card" style="text-decoration:none">
            <div class="noticia-img" style="${estiloImg}">
              ${conteudoImg}
            </div>
            <div class="noticia-body">
              <div class="noticia-date">${dataBR(n.criado_em)}</div>
              <h4>${esc(n.titulo)}</h4>
              <p>${esc(corta(n.descricao ?? '', 120))}</p>
              <span class="noticia-link">Leia mais →</span>
            </div>
          </a>`
}

function areaLista(noticias: SiteConteudo[]): string {
  // Sem notícia cadastrada a página não pode ficar em branco: o site
  // original mostrava a lista vazia sem aviso, o que parece defeito.
  const corpo = noticias.length
    ? cardDestaque(noticias[0]) +
      (noticias.length > 1
        ? `
        <div class="noticias-grid">
${noticias.slice(1).map(cardSimples).join('\n')}
        </div>
`
        : '')
    : `        <div style="text-align:center;padding:56px 24px;color:var(--muted)">
          <div style="font-size:48px;margin-bottom:14px">📰</div>
          <h3 style="font-family:'Montserrat',sans-serif;margin-bottom:8px">Nenhuma notícia publicada ainda</h3>
          <p>Volte em breve para acompanhar as novidades da cooperativa.</p>
        </div>
`

  return `    <!-- ── LISTA DE NOTÍCIAS ── -->
  <div style="background:linear-gradient(135deg,#0f1a0f,#1a5c1a);padding:56px 0 48px">
    <div class="container section-center">
      <span class="sec-tag" style="background:rgba(126,217,74,.15);color:#b0f070;border:1px solid rgba(126,217,74,.3)">COOPAIBI</span>
      <h1 style="font-size:38px;font-weight:900;color:#fff;font-family:'Montserrat',sans-serif;margin-bottom:12px">
        Notícias &amp; <em style="color:var(--glt);font-style:normal">Atualizações</em>
      </h1>
      <p style="font-size:16px;color:rgba(255,255,255,.72);max-width:520px;margin:0 auto">
        Acompanhe as últimas novidades da cooperativa, projetos e parcerias.
      </p>
    </div>
  </div>

  <div class="section" style="background:var(--light-bg)">
    <div class="container">
${corpo}    </div>
  </div>

`
}

export async function montarPaginaNoticias(orgId: string, slug: string): Promise<string> {
  const noticias = await buscarConteudosPorTipo(orgId, 'noticia')
  const materia = slug ? await buscarConteudoPorSlug(orgId, slug) : null

  const [p0, p1, p2, p3, p4] = NOTICIAS_PARTES

  const titulo = materia
    ? `${esc(materia.titulo)} — Notícias — COOPAIBI`
    : 'Notícias — COOPAIBI'
  const descricao = materia
    ? esc(corta(materia.descricao ?? '', 160))
    : 'Notícias e atualizações da COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia/BA'

  // Slug que não existe (ou notícia despublicada) cai na lista, em vez de
  // mostrar página vazia — mesmo comportamento do site original.
  const conteudo = materia ? areaMateria(materia) : areaLista(noticias)

  return p0 + titulo + p1 + descricao + p2 + montarTicker(noticias) + p3 + conteudo + p4
}
