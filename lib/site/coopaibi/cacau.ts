import { buscarCotacoesVitrine } from '@/lib/site/queries'
import { CACAU_PARTES } from '@/components/site/custom/coopaibi/content/cacau-partes'
import { buscarNoticiasTicker, montarFaixaTicker } from './ticker'

const FAIXA_FIXA = '🌿 COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia | Projeto Cacau que Refloresta'

// Monta a página Compra de Cacau do site da COOPAIBI com o preço vivo.
//
// O layout é o do site em cPanel (CACAU_PARTES é captura fiel dividida por
// scripts/espelho-coopaibi/dividir-cacau.mjs), mas os valores saem da
// tabela `cotacoes` do NexCoop em vez do cadastro próprio do site — que
// ficou parado em 24/05/2026 mostrando R$ 14,00/kg enquanto a cooperativa
// já pagava R$ 18,66. Produtor consulta essa página para decidir onde
// vender, então o número defasado tinha custo real.

// A arroba do cacau são 15 kg — é assim que o produtor negocia, e era o
// fator que o cacau.php aplicava (preco_kg * 15) antes de imprimir.
const KG_POR_ARROBA = 15

function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// O nome do produto vem do banco e é interpolado em HTML — escapar aqui é o
// que impede que um cadastro com "&" ou "<" quebre a página.
function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// A cotação vale a partir de um instante; o site mostra quando ela passou a
// valer, equivalente ao `atualizado_em` do cadastro antigo. Fuso fixado em
// America/Bahia: o servidor da Vercel roda em UTC e, sem isso, uma cotação
// registrada à noite apareceria com a data do dia seguinte.
function carimbo(iso: string, formato: 'curto' | 'longo'): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(formato === 'longo' ? { year: 'numeric' } : {}),
    timeZone: 'America/Bahia',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bahia',
  })
  return formato === 'longo' ? `${data} às ${hora}` : `${data} ${hora}`
}

export async function montarPaginaCacau(orgId: string): Promise<string> {
  const [cotacoes, noticias] = await Promise.all([
    buscarCotacoesVitrine(orgId),
    buscarNoticiasTicker(orgId),
  ])
  const c = cotacoes[0]

  const [p0, p1, p2, p3, p4, p5] = CACAU_PARTES
  const faixa = montarFaixaTicker(noticias, FAIXA_FIXA)

  // Sem cotação vigente a página não inventa número: os blocos de preço
  // somem e sobra o convite a consultar a cooperativa. Mostrar zero, ou o
  // valor velho, seria pior do que não mostrar.
  if (!c) {
    return (
      p0 + faixa + p1 + '' + p2 + '' + p3 +
      'Consulte a cooperativa para o preço do dia' + p4 + '' + p5
    )
  }

  const nome = esc(c.produto_nome)
  const unidade = esc(c.unidade)
  // No modelo da cooperativa o cooperado recebe MAIS: é preço de compra ao
  // produtor, não de venda. Por isso preco_cooperado fica acima do externo.
  const arrobaBase = reais(c.preco_externo * KG_POR_ARROBA)
  const arrobaCoop = reais(c.preco_cooperado * KG_POR_ARROBA)

  const updateHero = `<span class="hero-preco-update">📅 ${carimbo(c.vigente_a_partir_de, 'curto')}</span>`

  const precosHero = `<!-- PREÇO BASE -->
        <div class="hero-preco-row">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-family:'Montserrat',sans-serif">🏪 Preço Base</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${nome}</div>
          </div>
          <div class="hero-preco-valor">
            <strong>R$ ${arrobaBase}</strong>
            <span>por @ · R$ ${reais(c.preco_externo)}/${unidade}</span>
          </div>
        </div>
        <!-- PREÇO COOPERADO -->
        <div class="hero-preco-row" style="border-bottom:none">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--g2);text-transform:uppercase;letter-spacing:.8px;font-family:'Montserrat',sans-serif">⭐ Preço Cooperado</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${nome}</div>
          </div>
          <div class="hero-preco-valor">
            <strong style="color:var(--g2)">R$ ${arrobaCoop}</strong>
            <span>por @ · R$ ${reais(c.preco_cooperado)}/${unidade}</span>
          </div>
        </div>`

  const updateTabela = `Atualizado em ${carimbo(c.vigente_a_partir_de, 'longo')}`

  const linhaPrecoBase = `<div class="preco-linha">
            <div class="preco-linha-nome">${nome}</div>
            <div class="preco-linha-valor">R$ ${arrobaBase} <em>/ @</em></div>
            <div class="preco-linha-kg">R$ ${reais(c.preco_externo)} por ${unidade}</div>
          </div>
          <div class="preco-update">🕐 ${carimbo(c.vigente_a_partir_de, 'longo')}</div>`

  return (
    p0 + faixa + p1 + updateHero + p2 + precosHero + p3 + updateTabela + p4 + linhaPrecoBase + p5
  )
}
