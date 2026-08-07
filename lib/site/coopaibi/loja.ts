import { buscarProdutosLojaVitrine, type ProdutoVitrine } from '@/lib/site/queries'
import { LOJA_PARTES } from '@/components/site/custom/coopaibi/content/loja-partes'
import { buscarNoticiasTicker, montarFaixaTicker } from './ticker'

const FAIXA_FIXA = '🌿 COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia | Projeto Cacau que Refloresta'

// Monta a Loja do site da COOPAIBI a partir de `loja_produtos` — o cadastro
// de verdade, o mesmo que o PDV e o estoque usam.
//
// É a correção do problema nº 1 do PLANO_MODULO_SITE: o site tinha MySQL
// próprio, com produto cadastrado à mão em dois lugares. Na prática só um
// produto chegou a ser cadastrado lá (um podão), enquanto a Loja opera com
// 27. Lendo do NexCoop, o catálogo passa a refletir o que a cooperativa
// realmente vende, sem ninguém manter nada em dobro.
//
// O que o card do site mostrava e `loja_produtos` não tem: foto, descrição
// e selo de destaque. Sem foto, cai no marcador 🌱 que o próprio site já
// usava para produto sem imagem; sem destaque, a seção "Em destaque" some
// (ela já era condicional no original). Se esses campos existirem um dia,
// é aqui que entram.

const WHATSAPP = '5571999783992'

function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// As categorias são texto livre e foram digitadas de várias formas: hoje
// "Nutrição Animal", "Nutrição animal" e "nutrição animal" convivem, assim
// como "Acessório" e "Acessorio". Agrupar pelo valor cru mostraria seis
// categorias onde existem três. A chave normaliza caixa e acento; o rótulo
// exibido é a grafia mais frequente, que costuma ser a correta.
function semAcento(texto: string): string {
  // NFD separa a letra do acento; a faixa U+0300–U+036F são as marcas
  // combinantes, que saem fora. "Ração" e "Racao" passam a ser iguais.
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function chaveCategoria(nome: string): string {
  return semAcento(nome).trim().toLowerCase()
}

export interface CategoriaVitrine {
  chave: string
  rotulo: string
  total: number
}

export function agruparCategorias(produtos: ProdutoVitrine[]): CategoriaVitrine[] {
  const grupos = new Map<string, Map<string, number>>()
  for (const p of produtos) {
    const nome = p.categoria?.trim()
    if (!nome) continue
    const chave = chaveCategoria(nome)
    const grafias = grupos.get(chave) ?? new Map<string, number>()
    grafias.set(nome, (grafias.get(nome) ?? 0) + 1)
    grupos.set(chave, grafias)
  }

  const categorias: CategoriaVitrine[] = []
  for (const [chave, grafias] of grupos) {
    let rotulo = ''
    let maior = -1
    let total = 0
    for (const [grafia, n] of grafias) {
      total += n
      if (n > maior) {
        maior = n
        rotulo = grafia
      }
    }
    categorias.push({ chave, rotulo, total })
  }
  return categorias.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

function cardProduto(p: ProdutoVitrine): string {
  const nome = esc(p.nome)
  const categoria = p.categoria ? esc(p.categoria) : ''

  // O site mostra preço quando existe; sem preço, oferece o WhatsApp. Aqui
  // preco_normal é obrigatório no cadastro, mas o caminho continua valendo
  // para produto lançado com zero.
  // O loja.css é asset espelhado do site (byte a byte) — nada aqui pode
  // depender de classe nova, senão sairia sem estilo. Por isso a unidade e
  // o selo de cooperado usam estilo inline, e só classes que já existem no
  // CSS original aparecem no card.
  const temPreco = typeof p.preco_normal === 'number' && p.preco_normal > 0
  const rodape = temPreco
    ? `<span class="prod-preco">R$ ${reais(p.preco_normal)}</span>${
        p.unidade
          ? `\n              <span style="font-size:11px;color:var(--muted);display:block">por ${esc(p.unidade)}</span>`
          : ''
      }`
    : `<span class="prod-consulte">Consulte o atendente</span>
          <a href="https://wa.me/${WHATSAPP}?text=Ol%C3%A1!%20Tenho%20interesse%20no%20produto:%20${encodeURIComponent(p.nome)}" class="prod-wpp-btn" target="_blank" rel="noopener">
            💬 Fale conosco
          </a>`

  // desconto_cooperado é informação que o site antigo não tinha e a página
  // já prometia ("Cooperados têm condições especiais de preço").
  const seloCooperado =
    p.desconto_cooperado && p.desconto_cooperado_pct
      ? `\n      <div style="font-size:11px;font-weight:700;color:var(--g2);margin:4px 0 2px">⭐ Cooperado paga ${reais(p.desconto_cooperado_pct)}% menos</div>`
      : ''

  return `<div class="prod-card">
  <div class="prod-card-img">
      <div class="prod-card-sem-foto">🌱</div>
      </div>
  <div class="prod-card-body">
    <div class="prod-card-cat">${categoria}</div>
    <h3 class="prod-card-nome">${nome}</h3>${seloCooperado}
        <div class="prod-card-footer">
              ${rodape}
          </div>
  </div>
</div>`
}

function barraCategorias(categorias: CategoriaVitrine[], catAtiva: string): string {
  const links = categorias
    .map(
      (c) =>
        `          <a href="loja.php?cat=${encodeURIComponent(c.chave)}" class="loja-cat-link ${
          catAtiva === c.chave ? 'ativo' : ''
        }">
            ${esc(c.rotulo)}
          </a>`
    )
    .join('\n')
  return `          <a href="loja.php" class="loja-cat-link ${catAtiva ? '' : 'ativo'}">Todos os produtos</a>
${links}`
}

export interface FiltroLoja {
  cat: string
  busca: string
}

export async function montarPaginaLoja(orgId: string, filtro: FiltroLoja): Promise<string> {
  const [todos, noticias] = await Promise.all([
    buscarProdutosLojaVitrine(orgId),
    buscarNoticiasTicker(orgId),
  ])
  const categorias = agruparCategorias(todos)

  const catAtiva = filtro.cat ? chaveCategoria(filtro.cat) : ''
  // Busca sem acento nos dois lados. O cadastro tem "Ração Peixe" e "Racao
  // Peixe" convivendo, então comparar cru faria a busca por "ração" perder
  // produto que está lá — foi o que aconteceu na primeira versão.
  const buscaNormal = semAcento(filtro.busca).trim().toLowerCase()

  const produtos = todos.filter((p) => {
    if (catAtiva && chaveCategoria(p.categoria ?? '') !== catAtiva) return false
    if (buscaNormal && !semAcento(p.nome).toLowerCase().includes(buscaNormal)) return false
    return true
  })

  const rotuloCat = categorias.find((c) => c.chave === catAtiva)?.rotulo ?? ''

  const avisoFiltro =
    catAtiva || buscaNormal
      ? `<div class="loja-filtro-info">
            ${buscaNormal ? `Resultados para "<strong>${esc(filtro.busca.trim())}</strong>"` : ''}
            ${rotuloCat ? `Categoria: <strong>${esc(rotuloCat)}</strong>` : ''}
            — ${produtos.length} produto(s)
            <a href="loja.php" style="color:#2e8b2e;font-weight:700;margin-left:8px">Limpar filtro ✕</a>
          </div>`
      : ''

  const grade = produtos.length
    ? `<div class="prod-grid">
${produtos.map(cardProduto).join('\n')}
            </div>`
    : `<div class="loja-vazio">
              <div style="font-size:48px;margin-bottom:14px">🔍</div>
              <h3>Nenhum produto encontrado</h3>
              <p>Tente outro termo ou <a href="loja.php">veja todos os produtos</a>.</p>
            </div>`

  // Sem destaques em loja_produtos, a página começa direto no catálogo — o
  // original também omitia a seção quando não havia produto em destaque.
  const catalogo = `  <!-- CATÁLOGO -->
  <section class="section" id="catalogo">
    <div class="container">
      <div class="loja-layout">

        <!-- SIDEBAR CATEGORIAS -->
        <aside class="loja-sidebar">
          <div class="loja-sidebar-title">Categorias</div>
${barraCategorias(categorias, catAtiva)}
        </aside>

        <!-- PRODUTOS -->
        <div class="loja-main">
          ${avisoFiltro}
          ${grade}
        </div>
      </div>
    </div>
  </section>

`

  const categoriasRodape = categorias
    .map(
      (c) =>
        `<li><a href="loja.php?cat=${encodeURIComponent(c.chave)}">${esc(c.rotulo)}</a></li>`
    )
    .join('\n            ')

  const [p0, p1, p2, p3, p4] = LOJA_PARTES
  return (
    p0 + montarFaixaTicker(noticias, FAIXA_FIXA) +
    p1 + esc(filtro.busca) +
    p2 + catalogo +
    p3 + categoriasRodape +
    p4
  )
}
