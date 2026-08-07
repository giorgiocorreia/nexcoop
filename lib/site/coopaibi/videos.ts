import { buscarConteudosPorTipo } from '@/lib/site/queries'
import { VIDEOS_PARTES } from '@/components/site/custom/coopaibi/content/videos-partes'
import { buscarNoticiasTicker, montarFaixaTicker, esc } from './ticker'
import type { SiteConteudo } from '@/types/database'

// Galeria de Vídeos do site da COOPAIBI, lendo `site_conteudos` (tipo
// 'video'). O cadastro antigo do site guardava a URL do YouTube e o id já
// extraído; a migration 095 trouxe `youtube_id` e `categoria` para cá.
//
// A casca (hero, navbar, modal do player, rodapé, scripts) é captura fiel.
// As funções abrirVideo/compartilhar/copiarLink continuam sendo as do
// próprio site — por isso a página é servida como documento, e não JSX.

const FAIXA_FIXA = '🌿 COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia | Projeto Cacau que Refloresta'

// URL pública usada nos botões de compartilhar. Continua sendo o domínio da
// cooperativa: é o endereço que o visitante vai colar em algum lugar, e o
// da Vercel é temporário.
const SITE = 'https://coopaibi.com.br'

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function corta(texto: string, limite: number): string {
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto
}

export interface FiltroVideos {
  cat: string
  busca: string
  v: string
}

function blocoCompartilhar(v: SiteConteudo): string {
  const url = `${SITE}/videos.php?v=${esc(v.youtube_id ?? '')}`
  return `<a href="https://wa.me/?text=${encodeURIComponent(v.titulo)}%20${encodeURIComponent(url)}" target="_blank" class="sh-a sh-wpp">💬 WhatsApp</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="sh-a sh-fb">f Facebook</a>
            <button class="sh-a" onclick="copiarLink('${url}',this)">📋 Copiar link</button>`
}

function destaque(v: SiteConteudo): string {
  const yid = esc(v.youtube_id ?? '')
  const cat = v.categoria ? `<span class="badge-cat">${esc(v.categoria)}</span>` : ''
  const desc = v.descricao
    ? `<div class="vd-desc">${esc(corta(v.descricao, 160))}</div>`
    : ''
  return `      <!-- DESTAQUE -->
      <div class="sec-tag" style="margin-bottom:12px">⭐ Em destaque</div>
      <div class="vd-wrap">
        <div class="vd-thumb" onclick="abrirVideo('${yid}')">
          <img src="https://img.youtube.com/vi/${yid}/maxresdefault.jpg"
               onerror="this.src='https://img.youtube.com/vi/${yid}/hqdefault.jpg'"
               alt="${esc(v.titulo)}" />
          <div class="vd-play">
            <div class="vd-play-btn">▶</div>
          </div>
        </div>
        <div class="vd-body">
          <div>
            <div class="vd-badges">
              ${cat}<span class="badge-dest">⭐ Destaque</span>
            </div>
            <div class="vd-title">${esc(v.titulo)}</div>
            ${desc}
          </div>
          <div class="vd-actions">
            <button class="btn-assistir" onclick="abrirVideo('${yid}')">▶ Assistir agora</button>
            <button class="btn-share-d" onclick="compartilhar('${esc(v.titulo)}','${SITE}/videos.php?v=${yid}','sf-d')">🔗 Compartilhar</button>
          </div>
          <div class="vc-share-opts" id="sf-d" style="margin-top:12px;border-radius:10px;border:1px solid var(--border)">
            ${blocoCompartilhar(v)}
          </div>
        </div>
      </div>
`
}

function cardVideo(v: SiteConteudo, i: number): string {
  const yid = esc(v.youtube_id ?? '')
  const cat = v.categoria ? `<span class="badge-cat">${esc(v.categoria)}</span>` : ''
  return `            <div class="vc">
              <div class="vc-thumb" onclick="abrirVideo('${yid}')">
                <img src="https://img.youtube.com/vi/${yid}/mqdefault.jpg"
                     alt="${esc(v.titulo)}" loading="lazy" />
                <div class="vc-play"><div class="vc-play-btn">▶</div></div>
              </div>
              <div class="vc-body">
                <div class="vc-badges">${cat}</div>
                <div class="vc-title">${esc(v.titulo)}</div>
                <button class="btn-share" onclick="compartilhar('${esc(v.titulo)}','${SITE}/videos.php?v=${yid}','sf-${i}')">🔗 Compartilhar</button>
                <div class="vc-share-opts" id="sf-${i}">
                  ${blocoCompartilhar(v)}
                </div>
              </div>
            </div>`
}

export async function montarPaginaVideos(orgId: string, filtro: FiltroVideos): Promise<string> {
  const [todos, noticias] = await Promise.all([
    buscarConteudosPorTipo(orgId, 'video'),
    buscarNoticiasTicker(orgId),
  ])

  const categorias = [...new Set(todos.map((v) => v.categoria).filter(Boolean))] as string[]
  const catAtiva = filtro.cat
  const buscaNormal = semAcento(filtro.busca).trim().toLowerCase()

  const filtrados = todos.filter((v) => {
    if (catAtiva && v.categoria !== catAtiva) return false
    if (buscaNormal && !semAcento(v.titulo).toLowerCase().includes(buscaNormal)) return false
    return true
  })

  // O destaque só encabeça a galeria na visão sem filtro — com filtro, a
  // pessoa está procurando algo específico e o destaque atrapalharia. Mesmo
  // comportamento do videos.php original.
  const semFiltro = !catAtiva && !buscaNormal
  const emDestaque = semFiltro ? todos.find((v) => v.destaque) : undefined
  const naGrade = emDestaque ? filtrados.filter((v) => v.id !== emDestaque.id) : filtrados

  const linksCat = categorias
    .map(
      (c) =>
        `          <a href="videos.php?cat=${encodeURIComponent(c)}" class="cat-link ${catAtiva === c ? 'ativo' : ''}">${esc(c)}</a>`
    )
    .join('\n')

  const grade = naGrade.length
    ? `<div class="videos-grid">
${naGrade.map(cardVideo).join('\n')}
          </div>`
    : `<div style="text-align:center;padding:56px 24px;color:var(--muted)">
            <div style="font-size:48px;margin-bottom:14px">🎬</div>
            <h3 style="font-family:'Montserrat',sans-serif;margin-bottom:8px">Nenhum vídeo encontrado</h3>
            <p>Tente outro termo ou <a href="videos.php" style="color:var(--g2);font-weight:700">veja todos os vídeos</a>.</p>
          </div>`

  const conteudo = `  <section class="section" style="padding:48px 0">
    <div class="container">

${emDestaque ? destaque(emDestaque) : ''}
      <!-- GRID -->
      <div class="videos-layout">
        <aside class="videos-sidebar">
          <div class="sidebar-lbl">Categorias</div>
          <a href="videos.php" class="cat-link ${catAtiva ? '' : 'ativo'}">Todos</a>
${linksCat}
        </aside>

        <div>
          <form method="GET" style="margin-bottom:20px;display:flex;gap:10px">
            <input type="text" name="busca" placeholder="Buscar vídeo..." value="${esc(filtro.busca)}"
              style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:24px;font-size:13px;outline:none;font-family:'Montserrat',sans-serif" />
            <button type="submit" style="padding:10px 20px;background:var(--g2);color:#fff;border:none;border-radius:24px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif">Buscar</button>
          </form>

          ${grade}
        </div>
      </div>
    </div>
  </section>

`

  const [p0, p1, p2] = VIDEOS_PARTES
  return p0 + montarFaixaTicker(noticias, FAIXA_FIXA) + p1 + conteudo + p2
}
