// Preço internacional do cacau (contrato futuro CC=F, em USD/tonelada) —
// substitui o cacau-preco-bolsa.php do cPanel, que morre com a virada.
//
// A página de Compra de Cacau busca isto por fetch e preenche o card
// "Bolsa Internacional". Sem ele, o card fica no ⏳ para sempre.
//
// Mantém o formato de resposta do PHP campo por campo — o JS que consome
// está no HTML capturado e eu não vou reescrevê-lo por causa do backend.
//
// Nada disso vem do banco da cooperativa: é cotação de mercado externo,
// diferente das `cotacoes`, que são o preço que a COOPAIBI pratica.

interface RespostaBolsa {
  ok: boolean
  preco: number | null
  moeda: 'USD'
  unidade: 'tonelada'
  fonte: string
  timestamp: string
  cached_at: string
}

function agora(): string {
  // Mesmo formato do PHP ('Y-m-d H:i:s'), no fuso da cooperativa.
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Bahia' })
    .replace('T', ' ')
}

function deIso(epochSegundos: number): string {
  return new Date(epochSegundos * 1000)
    .toLocaleString('sv-SE', { timeZone: 'America/Bahia' })
    .replace('T', ' ')
}

// Timeout curto: é um card lateral, não vale segurar a página do visitante
// esperando um provedor externo. O PHP usava 8s.
async function buscar(url: string): Promise<Response | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json,text/csv', 'user-agent': 'Mozilla/5.0' },
    })
    return r.ok ? r : null
  } catch {
    return null
  }
}

async function doYahoo(): Promise<{ preco: number; timestamp: string } | null> {
  const r = await buscar(
    'https://query1.finance.yahoo.com/v8/finance/chart/CC=F?interval=1d&range=1d'
  )
  if (!r) return null
  try {
    const j = await r.json()
    const meta = j?.chart?.result?.[0]?.meta
    const preco = meta?.regularMarketPrice
    if (typeof preco !== 'number' || !Number.isFinite(preco)) return null
    return {
      preco: Math.round(preco * 100) / 100,
      timestamp: meta?.regularMarketTime ? deIso(meta.regularMarketTime) : agora(),
    }
  } catch {
    return null
  }
}

// Reserva, como no PHP: se o Yahoo sair do ar ou mudar o formato, o card
// continua mostrando número em vez de erro.
async function doStooq(): Promise<{ preco: number } | null> {
  const r = await buscar('https://stooq.com/q/l/?s=cc.f&f=sd2t2ohlcv&h&e=csv')
  if (!r) return null
  try {
    const linhas = (await r.text()).trim().split('\n')
    if (linhas.length < 2) return null
    const preco = Number(linhas[1].split(',')[4])
    if (!Number.isFinite(preco) || preco <= 0) return null
    return { preco: Math.round(preco * 100) / 100 }
  } catch {
    return null
  }
}

export async function GET() {
  const yahoo = await doYahoo()
  const stooq = yahoo ? null : await doStooq()

  const corpo: RespostaBolsa = {
    ok: Boolean(yahoo || stooq),
    preco: yahoo?.preco ?? stooq?.preco ?? null,
    moeda: 'USD',
    unidade: 'tonelada',
    fonte: yahoo ? 'Yahoo Finance / ICE' : stooq ? 'Stooq / ICE' : 'ICE/NYSE',
    timestamp: yahoo?.timestamp ?? agora(),
    cached_at: agora(),
  }

  return Response.json(corpo, {
    headers: {
      // O PHP guardava 1h em arquivo temporário; aqui o cache do CDN faz o
      // mesmo papel, sem estado no servidor. `stale-while-revalidate` evita
      // que a primeira visita depois de expirar pague a espera do provedor.
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
