import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron invoca GET a cada 6h com Authorization: Bearer <CRON_SECRET>
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]
  const resultados: Record<string, unknown> = {}

  // ── ICE NY (CC=F) via Yahoo Finance ────────────────────────────────────────
  try {
    const iceData = await fetchIceNyPrice()
    if (iceData) {
      const cambio = await fetchUsdBrl()
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'cacau',
        fonte: 'ice_ny',
        preco_usd: iceData.preco_usd,
        preco_brl: cambio ? iceData.preco_usd * cambio / 1000 : null, // USD/ton → BRL/kg
        cambio_usd_brl: cambio,
        data_referencia: iceData.data ?? hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.ice_ny = { preco_usd: iceData.preco_usd, cambio }
    }
  } catch (e) {
    resultados.ice_ny_erro = String(e)
  }

  // ── Mercado fisico Bahia (BRL/arroba) ──────────────────────────────────────
  try {
    const bahia = await fetchPrecoBahia()
    if (bahia) {
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'cacau',
        fonte: 'precodocacau',
        preco_brl: bahia.preco_brl, // BRL/arroba (15kg)
        preco_usd: null,
        cambio_usd_brl: null,
        data_referencia: bahia.data ?? hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.cacau_bahia = { preco_brl: bahia.preco_brl, data: bahia.data }
    } else {
      resultados.cacau_bahia_erro = 'nenhum parser reconheceu a pagina'
    }
  } catch (e) {
    resultados.cacau_bahia_erro = String(e)
  }

  return NextResponse.json({ ok: true, data: resultados })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchIceNyPrice(): Promise<{ preco_usd: number; data: string | null } | null> {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/CC=F?interval=1d&range=5d',
    {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!res.ok) return null
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) return null
  const timestamps: number[] = result.timestamp ?? []
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? []
  // Última cotação válida (pode haver nulls no final se mercado fechado)
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      const data = timestamps[i]
        ? new Date(timestamps[i] * 1000).toISOString().split('T')[0]
        : null
      return { preco_usd: closes[i], data }
    }
  }
  return null
}

// PTAX venda do Banco Central: oficial, gratuita, sem chave. E o mesmo numero que
// o mercado usa para converter USD/ton em BRL. Yahoo fica so como rede de seguranca.
async function fetchUsdBrl(): Promise<number | null> {
  return (await fetchPtaxVenda()) ?? (await fetchUsdBrlYahoo())
}

async function fetchPtaxVenda(): Promise<number | null> {
  // Janela de 10 dias: cobre fim de semana e feriado sem cair no fallback.
  const mmddyyyy = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`
  const fim = new Date()
  const ini = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

  const url =
    'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/' +
    `CotacaoDolarPeriodo(dataInicial=@i,dataFinalCotacao=@f)?@i='${mmddyyyy(ini)}'&@f='${mmddyyyy(fim)}'` +
    '&$format=json&$orderby=dataHoraCotacao%20desc&$top=1'

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const json = await res.json()
    const venda = json?.value?.[0]?.cotacaoVenda
    return typeof venda === 'number' && venda > 0 ? venda : null
  } catch {
    return null
  }
}

async function fetchUsdBrlYahoo(): Promise<number | null> {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/USDBRL=X?interval=1d&range=1d',
    {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    }
  )
  if (!res.ok) return null
  const json = await res.json()
  const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) return closes[i]
  }
  return null
}

// Fonte: precodocacau.com.br (Cacau Bahia, R$/arroba).
// O site ja migrou o schema uma vez (Product/offers -> Dataset/variableMeasured) e
// quebrou este parser em silencio. Por isso: tres caminhos, e null explicito se
// nenhum reconhecer — o cron reporta cacau_bahia_erro em vez de fingir sucesso.
const PRECO_ARROBA_MIN = 50
const PRECO_ARROBA_MAX = 2000

function precoPlausivel(v: number): boolean {
  return Number.isFinite(v) && v >= PRECO_ARROBA_MIN && v <= PRECO_ARROBA_MAX
}

async function fetchPrecoBahia(): Promise<{ preco_brl: number; data: string | null } | null> {
  let html: string | null = null

  try {
    const res = await fetch('https://precodocacau.com.br/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexCoop/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) html = await res.text()
  } catch { /* tenta jina */ }

  if (!html) {
    try {
      const res = await fetch('https://r.jina.ai/https://precodocacau.com.br/', {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) html = await res.text()
    } catch { return null }
  }

  if (!html) return null

  const scriptTags = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? []

  // 1) Schema atual: Dataset.variableMeasured[] com "Cacau Bahia — preço por arroba (15 kg)"
  for (const script of scriptTags) {
    try {
      const json = JSON.parse(script.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''))
      const vars: Array<{ name?: string; value?: number | string; unitText?: string }> =
        Array.isArray(json?.variableMeasured) ? json.variableMeasured : []
      const arroba = vars.find(v => /^Cacau Bahia\b.*arroba/i.test(v.name ?? ''))
      if (arroba?.value != null) {
        const preco = Number(arroba.value)
        if (!precoPlausivel(preco)) continue
        const data = typeof json.dateModified === 'string'
          ? json.dateModified.split('T')[0]
          : null
        return { preco_brl: preco, data }
      }
    } catch { continue }
  }

  // 2) Schema antigo: Product.offers[] com name === "Cacau Bahia"
  for (const script of scriptTags) {
    try {
      const json = JSON.parse(script.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''))
      const offers: Array<{ name?: string; price?: number | string; priceValidUntil?: string }> =
        Array.isArray(json?.offers) ? json.offers : []
      const bahia = offers.find(o => o.name === 'Cacau Bahia')
      if (bahia?.price != null) {
        const preco = Number(bahia.price)
        if (!precoPlausivel(preco)) continue
        let data: string | null = null
        if (bahia.priceValidUntil && /\d{2}\/\d{2}\/\d{4}/.test(bahia.priceValidUntil)) {
          const [d, m, y] = bahia.priceValidUntil.split('/')
          data = `${y}-${m}-${d}`
        }
        return { preco_brl: preco, data }
      }
    } catch { continue }
  }

  // 3) Ultimo recurso: objeto window.CDC embutido na pagina
  const cdc = html.match(/"bahia"\s*:\s*\{[^}]*?"preco_arroba"\s*:\s*([\d.]+)/)
  if (cdc) {
    const preco = Number(cdc[1])
    if (precoPlausivel(preco)) {
      const dt = html.match(/atualizado_em:\s*"(\d{4}-\d{2}-\d{2})/)
      return { preco_brl: preco, data: dt?.[1] ?? null }
    }
  }

  return null
}
