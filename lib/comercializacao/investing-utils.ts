// Parser puro do payload __NEXT_DATA__ da pagina de cacau do investing.com.
// Sem I/O: recebe o HTML, devolve os indices. O fetch fica em quem chama.
//
// AVISO: __NEXT_DATA__ e estado interno do Next.js deles, nao contrato publico.
// Quebra sem aviso quando migrarem de framework. Toda leitura passa por faixa de
// plausibilidade e devolve null em vez de chutar.

export interface IndiceTecnico {
  timeframe: string
  sinal: 'strong_sell' | 'sell' | 'neutral' | 'buy' | 'strong_buy' | string
}

export interface ContratoCurva {
  symbol: string
  last: number | null
  bid: number | null
  ask: number | null
  variacaoDiaPct: number | null
  atrasado: boolean
  bolsa: string | null
}

export interface IndicesCacau {
  // identificacao
  nome: string | null
  symbol: string | null          // ex: CCc2 — 2o contrato continuo, NAO o mes corrente
  mesContrato: string | null     // ex: "Set 26"
  moeda: string | null
  unidade: string | null
  emTempoReal: boolean | null    // isDelayed === false
  atualizadoEm: string | null    // ISO

  // preco
  ultimo: number | null
  variacao: number | null
  variacaoPct: number | null
  abertura: number | null
  fechamentoAnterior: number | null
  maxima: number | null
  minima: number | null
  bid: number | null
  ask: number | null
  volume: number | null
  openInterest: number | null
  max52sem: number | null
  min52sem: number | null

  // variacoes por janela (%)
  variacoes: { janela: string; pct: number | null }[]

  // ficha do contrato
  ficha: { label: string; valor: string }[]

  // analise tecnica por timeframe
  tecnico: IndiceTecnico[]

  // curva de vencimentos
  curva: ContratoCurva[]
}

const num = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v)
  return Number.isFinite(n) ? n : null
}

/** USD/tonelada de cacau: rejeita lixo de parse fora desta faixa. */
const USD_TON_MIN = 500
const USD_TON_MAX = 30000
const precoPlausivel = (v: number | null): number | null =>
  v != null && v >= USD_TON_MIN && v <= USD_TON_MAX ? v : null

const JANELAS: [string, string][] = [
  ['pct_1d', '1 dia'], ['pct_1w', '1 semana'], ['pct_1m', '1 mês'],
  ['pct_3m', '3 meses'], ['pct_6m', '6 meses'], ['pct_ytd', 'No ano'],
  ['pct_1y', '1 ano'], ['pct_3y', '3 anos'], ['pct_5y', '5 anos'],
]

const TIMEFRAMES: [string, string][] = [
  ['PT5M', '5 min'], ['PT15M', '15 min'], ['PT1H', '1 hora'],
  ['PT5H', '5 horas'], ['P1D', 'Diário'], ['P1W', 'Semanal'], ['P1M', 'Mensal'],
]

const FICHA: [string, string][] = [
  ['month', 'Mês do contrato'],
  ['contract_size', 'Tamanho do contrato'],
  ['settlement_type', 'Liquidação'],
  ['settlement_day', 'Vencimento'],
  ['tick_size', 'Tick'],
  ['point_value', 'Valor do ponto'],
  ['trading_months', 'Meses negociados'],
]

export function parseIndicesCacau(html: string): IndicesCacau | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null

  let root: Record<string, unknown>
  try {
    root = JSON.parse(m[1])
  } catch {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = (root as any)?.props?.pageProps?.state?.commodityStore
  const inst = store?.instrument
  if (!inst?.price) return null

  const p = inst.price
  const km = store.keyMetrics ?? {}
  const pc = store.priceChanges ?? {}

  const ultimo = precoPlausivel(num(p.last))
  if (ultimo == null) return null // sem o preco principal, a pagina nao serve

  const fichaRaw: Record<string, unknown> = km
  const ficha = FICHA
    .filter(([k]) => fichaRaw[k] != null && fichaRaw[k] !== '')
    .map(([k, label]) => {
      let valor = String(fichaRaw[k])
      if (k === 'settlement_day') valor = valor.slice(0, 10).split('-').reverse().join('/')
      return { label, valor }
    })

  const tecnico = TIMEFRAMES
    .filter(([k]) => inst.technical?.summary?.[k])
    .map(([k, timeframe]) => ({ timeframe, sinal: String(inst.technical.summary[k]) }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curva: ContratoCurva[] = (inst.relatives?.relatives ?? []).map((r: any) => ({
    symbol: String(r.symbol ?? '—'),
    last: precoPlausivel(num(r.last)),
    bid: precoPlausivel(num(r.bid)),
    ask: precoPlausivel(num(r.ask)),
    variacaoDiaPct: num(r.changeOneDayPercent),
    atrasado: String(r.delayed) === '1',
    bolsa: r.exchangeName || null,
  }))

  return {
    nome: p.long_name ?? inst.name?.fullName ?? null,
    symbol: inst.name?.symbol ?? null,
    mesContrato: km.month ?? null,
    moeda: p.currency ?? null,
    unidade: inst.commodityData?.unit === '_instr_unit_metric_ton' ? 'tonelada métrica' : null,
    emTempoReal: typeof p.isDelayed === 'boolean' ? !p.isDelayed : null,
    atualizadoEm: p.lastUpdateTime ? new Date(Number(p.lastUpdateTime)).toISOString() : null,

    ultimo,
    variacao: num(p.change),
    variacaoPct: num(p.changePcr),
    abertura: precoPlausivel(num(p.open)),
    fechamentoAnterior: precoPlausivel(num(p.lastClose)),
    maxima: precoPlausivel(num(p.high)),
    minima: precoPlausivel(num(p.low)),
    bid: precoPlausivel(num(inst.bidding?.bid)),
    ask: precoPlausivel(num(inst.bidding?.ask)),
    volume: num(p.volume),
    openInterest: num(km.open_interest),
    max52sem: precoPlausivel(num(p.fiftyTwoWeekHigh)),
    min52sem: precoPlausivel(num(p.fiftyTwoWeekLow)),

    variacoes: JANELAS.map(([k, janela]) => ({ janela, pct: num(pc[k]) })),
    ficha,
    tecnico,
    curva,
  }
}

export const SINAL_LABEL: Record<string, { label: string; bg: string; cor: string }> = {
  strong_buy:  { label: 'Compra forte', bg: '#DCFCE7', cor: '#15803D' },
  buy:         { label: 'Compra',       bg: '#F0FDF4', cor: '#15803D' },
  neutral:     { label: 'Neutro',       bg: '#F1F5F9', cor: '#475569' },
  sell:        { label: 'Venda',        bg: '#FEF2F2', cor: '#B91C1C' },
  strong_sell: { label: 'Venda forte',  bg: '#FEE2E2', cor: '#991B1B' },
}
