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

  // ── CEPEA (cacau, BRL/arroba) ───────────────────────────────────────────────
  try {
    const cepeaData = await fetchCepeaPrice()
    if (cepeaData) {
      const supabase = createAdminClient()
      await supabase.from('cotacoes_mercado_externo').upsert({
        produto: 'cacau',
        fonte: 'cepea',
        preco_brl: cepeaData.preco_brl, // BRL/arroba (15kg)
        preco_usd: null,
        cambio_usd_brl: null,
        data_referencia: cepeaData.data ?? hoje,
        coletado_em: new Date().toISOString(),
      }, { onConflict: 'fonte,produto,data_referencia' })
      resultados.cepea = { preco_brl: cepeaData.preco_brl, data: cepeaData.data }
    }
  } catch (e) {
    resultados.cepea_erro = String(e)
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

async function fetchUsdBrl(): Promise<number | null> {
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

async function fetchCepeaPrice(): Promise<{ preco_brl: number; data: string | null } | null> {
  const res = await fetch('https://www.cepea.esalq.usp.br/br/indicador/cacau.aspx', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NexCoop/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) return null
  const html = await res.text()

  // Tenta extrair data e preço do HTML da CEPEA
  // Padrão esperado: célula com dd/mm/yyyy seguida de célula com valor em BRL
  const patterns = [
    // Formato: "12/06/2026" ... "1.456,78"
    /(\d{2}\/\d{2}\/\d{4})[^<]{0,200}?([\d]{1,2}\.[\d]{3},\d{2})/s,
    // Formato sem ponto de milhar: "456,78"
    /(\d{2}\/\d{2}\/\d{4})[^<]{0,200}?([\d]+,\d{2})/s,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      const [, dataBr, precoStr] = match
      const preco = parseFloat(precoStr.replace(/\./g, '').replace(',', '.'))
      if (isNaN(preco) || preco < 100) continue // preço muito baixo = parse errado
      const [d, m, y] = dataBr.split('/')
      const data = `${y}-${m}-${d}`
      return { preco_brl: preco, data }
    }
  }
  return null
}
