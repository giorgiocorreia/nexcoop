import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron invoca GET diariamente as 08:00 UTC (ver vercel.json) com
// Authorization: Bearer <CRON_SECRET>
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]
  const resultados: Record<string, unknown> = {}

  // Uma unica leitura da pagina alimenta ICE e mercado fisico.
  let pagina: PrecoDoCacau | null = null
  try {
    pagina = await fetchPrecoDoCacau()
  } catch (e) {
    resultados.precodocacau_erro = String(e)
  }

  const cambio = await fetchUsdBrl()

  // ── USD/BRL (PTAX) ─────────────────────────────────────────────────────────
  // getUsdBrl() no dashboard le produto='usd_brl', fonte='bcb'. Essa linha nunca
  // era gravada: o card "USD / BRL" do Indice Nex ficava sempre em "—".
  try {
    if (cambio != null) {
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'usd_brl',
        fonte: 'bcb',
        preco_brl: cambio,
        preco_usd: null,
        cambio_usd_brl: cambio,
        data_referencia: hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.usd_brl = { cotacao: cambio }
    } else {
      resultados.usd_brl_erro = 'PTAX e Yahoo indisponiveis'
    }
  } catch (e) {
    resultados.usd_brl_erro = String(e)
  }

  // ── ICE NY (USD/ton) ───────────────────────────────────────────────────────
  try {
    // Preferimos o precodocacau; Yahoo (CC=F) so se a pagina nao trouxer o valor.
    let precoUsd = pagina?.iceUsdTon ?? null
    let dataIce = pagina?.data ?? null
    let origem = 'precodocacau'

    if (precoUsd == null) {
      const yahoo = await fetchIceNyYahoo()
      if (yahoo) {
        precoUsd = yahoo.preco_usd
        dataIce = yahoo.data
        origem = 'yahoo'
      }
    }

    if (precoUsd != null) {
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'cacau',
        fonte: 'ice_ny',
        preco_usd: precoUsd,
        preco_brl: cambio ? precoUsd * cambio / 1000 : null, // USD/ton → BRL/kg
        cambio_usd_brl: cambio,
        data_referencia: dataIce ?? hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.ice_ny = { preco_usd: precoUsd, cambio, origem, contrato: pagina?.contrato ?? null }
    } else {
      resultados.ice_ny_erro = 'sem valor no precodocacau nem no Yahoo'
    }
  } catch (e) {
    resultados.ice_ny_erro = String(e)
  }

  // ── Mercado fisico Bahia (BRL/arroba) ──────────────────────────────────────
  try {
    if (pagina?.bahiaArroba != null) {
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'cacau',
        fonte: 'precodocacau',
        preco_brl: pagina.bahiaArroba, // BRL/arroba (15kg)
        preco_usd: null,
        cambio_usd_brl: null,
        data_referencia: pagina.data ?? hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.cacau_bahia = { preco_brl: pagina.bahiaArroba, data: pagina.data }
    } else {
      resultados.cacau_bahia_erro = 'nenhum parser reconheceu a pagina'
    }
  } catch (e) {
    resultados.cacau_bahia_erro = String(e)
  }

  return NextResponse.json({ ok: true, data: resultados })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Fallback do ICE, usado so quando o precodocacau nao traz o valor.
async function fetchIceNyYahoo(): Promise<{ preco_usd: number; data: string | null } | null> {
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

// Fonte: precodocacau.com.br — mercado fisico da Bahia (R$/arroba) e ICE NY
// (USD/ton). Eles nao expoem API: o ICE vem do objeto window.CDC embutido na
// pagina, e a Bahia do JSON-LD. O site ja migrou o schema uma vez
// (Product/offers -> Dataset/variableMeasured) e quebrou este parser em
// silencio, entao cada valor tem mais de um caminho e a faixa de
// plausibilidade barra lixo. Nenhum caminho reconhecido => null explicito, e o
// cron reporta erro em vez de fingir sucesso.
interface PrecoDoCacau {
  bahiaArroba: number | null
  iceUsdTon: number | null
  contrato: string | null
  data: string | null
}

const ARROBA_MIN = 50, ARROBA_MAX = 2000
const ICE_MIN = 500, ICE_MAX = 30000

const naFaixa = (v: number, min: number, max: number) =>
  Number.isFinite(v) && v >= min && v <= max

async function fetchPrecoDoCacau(): Promise<PrecoDoCacau | null> {
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
  const jsonLd: Record<string, unknown>[] = []
  for (const script of scriptTags) {
    try {
      jsonLd.push(JSON.parse(script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')))
    } catch { /* ignora bloco invalido */ }
  }

  let data: string | null = null
  let bahiaArroba: number | null = null

  // Bahia, 1) schema atual: Dataset.variableMeasured[]
  for (const json of jsonLd) {
    const vars = Array.isArray(json.variableMeasured)
      ? (json.variableMeasured as Array<{ name?: string; value?: number | string }>)
      : []
    const arroba = vars.find(v => /^Cacau Bahia\b.*arroba/i.test(v.name ?? ''))
    if (arroba?.value != null) {
      const preco = Number(arroba.value)
      if (!naFaixa(preco, ARROBA_MIN, ARROBA_MAX)) continue
      bahiaArroba = preco
      if (typeof json.dateModified === 'string') data = json.dateModified.split('T')[0]
      break
    }
  }

  // Bahia, 2) schema antigo: Product.offers[]
  if (bahiaArroba == null) {
    for (const json of jsonLd) {
      const offers = Array.isArray(json.offers)
        ? (json.offers as Array<{ name?: string; price?: number | string; priceValidUntil?: string }>)
        : []
      const bahia = offers.find(o => o.name === 'Cacau Bahia')
      if (bahia?.price != null) {
        const preco = Number(bahia.price)
        if (!naFaixa(preco, ARROBA_MIN, ARROBA_MAX)) continue
        bahiaArroba = preco
        if (bahia.priceValidUntil && /\d{2}\/\d{2}\/\d{4}/.test(bahia.priceValidUntil)) {
          const [d, m, y] = bahia.priceValidUntil.split('/')
          data = `${y}-${m}-${d}`
        }
        break
      }
    }
  }

  // Bahia, 3) ultimo recurso: window.CDC
  if (bahiaArroba == null) {
    const m = html.match(/"bahia"\s*:\s*\{[^}]*?"preco_arroba"\s*:\s*([\d.]+)/)
    if (m && naFaixa(Number(m[1]), ARROBA_MIN, ARROBA_MAX)) bahiaArroba = Number(m[1])
  }

  // ICE: so existe no window.CDC — nao esta no JSON-LD.
  let iceUsdTon: number | null = null
  const ice = html.match(/"ice_usd_ton"\s*:\s*([\d.]+)/)
  if (ice && naFaixa(Number(ice[1]), ICE_MIN, ICE_MAX)) iceUsdTon = Number(ice[1])

  const contrato = html.match(/"contrato"\s*:\s*"([^"]+)"/)?.[1]?.replace(/\\\//g, '/') ?? null

  if (!data) data = html.match(/atualizado_em:\s*"(\d{4}-\d{2}-\d{2})/)?.[1] ?? null

  if (bahiaArroba == null && iceUsdTon == null) return null
  return { bahiaArroba, iceUsdTon, contrato, data }
}
