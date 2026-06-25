'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const PESOS = { oferta: 0.40, demanda: 0.30, financeiro: 0.20, macro: 0.10 }

function calcularFaixa(score: number): 'forte_baixa' | 'baixa' | 'estavel' | 'alta' | 'forte_alta' {
  if (score <= 20) return 'forte_baixa'
  if (score <= 40) return 'baixa'
  if (score <= 60) return 'estavel'
  if (score <= 80) return 'alta'
  return 'forte_alta'
}

function calcularProbabilidades(score: number) {
  const fAlta   = Math.min(Math.max((score - 70) * 2, 0), 40)
  const alta    = Math.min(Math.max((score - 40) * 1.5 - fAlta, 0), 60)
  const baixa   = Math.min(Math.max((50 - score) * 1.2, 0), 50)
  const estavel = Math.max(100 - Math.round(fAlta) - Math.round(alta) - Math.round(baixa), 5)
  return {
    prob_forte_alta:  Math.round(fAlta),
    prob_alta:        Math.round(alta),
    prob_estavel:     estavel,
    prob_baixa:       Math.round(baixa),
    prob_forte_baixa: 0,
  }
}

async function coletarSinaisNoticias(orgId: string) {
  const fontes = [
    { url: 'https://news.google.com/rss/search?q=cocoa+market&hl=pt-BR&gl=BR', nome: 'Google News' },
    { url: 'https://www.icco.org/category/news/', nome: 'ICCO' },
  ]
  const sinais: Array<{
    dimensao: 'oferta' | 'demanda' | 'financeiro' | 'macro'
    fonte: string
    titulo: string
    url: string
    impacto: number
    peso: number
  }> = []

  for (const fonte of fontes) {
    try {
      const res = await fetch(`https://r.jina.ai/${fonte.url}`, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(8000),
      })
      const texto = await res.text()
      if (!texto || texto.length < 100) continue

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Analise as notícias abaixo sobre mercado de cacau. Para cada notícia relevante retorne JSON array: [{"titulo": string, "dimensao": "oferta"|"demanda"|"financeiro"|"macro", "impacto": -2|-1|0|1|2, "url": string}]. Impacto: -2 forte baixa, 2 forte alta. Retorne APENAS o JSON array sem texto adicional.\n\nNotícias:\n${texto.slice(0, 3000)}`,
          }],
        }),
      })
      const dados = await resp.json()
      const texto_resp = dados.content?.[0]?.text ?? '[]'
      const parsed = JSON.parse(texto_resp.replace(/```json|```/g, '').trim())
      for (const item of (Array.isArray(parsed) ? parsed : []).slice(0, 4)) {
        sinais.push({
          dimensao: item.dimensao,
          fonte: fonte.nome,
          titulo: item.titulo,
          url: item.url ?? fonte.url,
          impacto: item.impacto,
          peso: 1.0,
        })
      }
    } catch { /* falhou silenciosamente */ }
  }
  return sinais
}

async function coletarENSO(): Promise<{ impacto: number; descricao: string }> {
  try {
    const res = await fetch(
      'https://r.jina.ai/https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
      { signal: AbortSignal.timeout(6000) }
    )
    const texto = await res.text()
    if (texto.includes('La Ni')) return { impacto: 1, descricao: 'La Niña ativa — redução de oferta esperada' }
    if (texto.includes('El Ni')) return { impacto: -1, descricao: 'El Niño ativo — risco de excesso de chuvas' }
    return { impacto: 0, descricao: 'ENSO neutro' }
  } catch {
    return { impacto: 0, descricao: 'ENSO não disponível' }
  }
}

async function coletarPrecoBahia(orgId: string) {
  try {
    const res = await fetch('https://r.jina.ai/https://precodocacau.com.br/', {
      signal: AbortSignal.timeout(8000),
    })
    const texto = await res.text()
    const match = texto.match(/Bahia hoje[^\d]*R\$\s*([\d.,]+)/i)
    if (!match) return
    const valor = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    const supabase = createAdminClient()
    await supabase.from('cotacoes_mercado_externo').upsert({
      produto: 'cacau',
      fonte: 'precodocacau',
      preco_brl: valor,
      preco_usd: null,
      cambio_usd_brl: null,
      data_referencia: new Date().toISOString().split('T')[0],
    }, { onConflict: 'produto,fonte,data_referencia' })
  } catch { /* falhou silenciosamente */ }
}

async function coletarUsdBrl() {
  try {
    const hoje = new Date()
    const dd = String(hoje.getDate()).padStart(2, '0')
    const mm = String(hoje.getMonth() + 1).padStart(2, '0')
    const yyyy = hoje.getFullYear()
    const res = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@d)?@d='${mm}-${dd}-${yyyy}'&$format=json`,
      { signal: AbortSignal.timeout(6000) }
    )
    const dados = await res.json()
    const valor = dados?.value?.[0]?.cotacaoVenda
    if (!valor) return
    const supabase = createAdminClient()
    await supabase.from('cotacoes_mercado_externo').upsert({
      produto: 'usd_brl',
      fonte: 'bcb',
      preco_brl: valor,
      preco_usd: 1,
      cambio_usd_brl: valor,
      data_referencia: new Date().toISOString().split('T')[0],
    }, { onConflict: 'produto,fonte,data_referencia' })
  } catch { /* falhou silenciosamente */ }
}

function calcularScores(
  sinais: Awaited<ReturnType<typeof coletarSinaisNoticias>>,
  enso: Awaited<ReturnType<typeof coletarENSO>>
) {
  const normalizar = (impacto: number) => ((impacto + 2) / 4) * 100
  const por: Record<string, number[]> = { oferta: [], demanda: [], financeiro: [], macro: [] }
  for (const s of sinais) por[s.dimensao].push(normalizar(s.impacto) * s.peso)
  por.oferta.push(normalizar(enso.impacto))
  const media = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 50
  const scoreOferta     = media(por.oferta)
  const scoreDemanda    = media(por.demanda)
  const scoreFinanceiro = media(por.financeiro)
  const scoreMacro      = media(por.macro)
  const scoreFinal =
    scoreOferta * PESOS.oferta +
    scoreDemanda * PESOS.demanda +
    scoreFinanceiro * PESOS.financeiro +
    scoreMacro * PESOS.macro
  return {
    score_final:      Math.round(scoreFinal * 100) / 100,
    faixa:            calcularFaixa(scoreFinal),
    score_oferta:     Math.round(scoreOferta),
    score_demanda:    Math.round(scoreDemanda),
    score_financeiro: Math.round(scoreFinanceiro),
    score_macro:      Math.round(scoreMacro),
    ...calcularProbabilidades(scoreFinal),
  }
}

export async function atualizarIndiceNex(orgIdParam?: string) {
  const supabase = createAdminClient()
  const orgId = orgIdParam ?? (await getUsuarioLogado()).organizacao_id
  if (!orgId) throw new Error('Organização não encontrada')

  const [sinais, enso] = await Promise.all([
    coletarSinaisNoticias(orgId),
    coletarENSO(),
    coletarPrecoBahia(orgId),
    coletarUsdBrl(),
  ])

  const scores = calcularScores(sinais, enso)

  const { data: snapshot, error } = await supabase
    .from('indice_nex_snapshots')
    .insert({ organizacao_id: orgId, commodity: 'cacau', ...scores })
    .select('id')
    .single()

  if (error || !snapshot) throw new Error('Erro ao salvar snapshot: ' + error?.message)

  if (sinais.length > 0) {
    await supabase.from('indice_nex_sinais').insert(
      sinais.map(s => ({ snapshot_id: snapshot.id, organizacao_id: orgId, descricao: null, valor_raw: null, ...s }))
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/comercializacao/painel')
  return scores
}

export async function getUltimoIndiceNex(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('indice_nex_snapshots')
    .select('*')
    .eq('organizacao_id', orgId)
    .eq('commodity', 'cacau')
    .order('calculado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getHistoricoIndiceNex(orgId: string, dias = 30) {
  const supabase = createAdminClient()
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('indice_nex_snapshots')
    .select('calculado_em, score_final, faixa')
    .eq('organizacao_id', orgId)
    .eq('commodity', 'cacau')
    .gte('calculado_em', desde)
    .order('calculado_em', { ascending: true })
  return data ?? []
}

export async function getSinaisAtivos(orgId: string) {
  const supabase = createAdminClient()
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('indice_nex_sinais')
    .select('*')
    .eq('organizacao_id', orgId)
    .gte('coletado_em', desde)
    .order('coletado_em', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function getCotacoesMoageiras(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cotacoes_mercado_externo')
    .select('*')
    .eq('produto', 'cacau')
    .in('fonte', ['barry_callebaut', 'cargill', 'olam'])
    .order('data_referencia', { ascending: false })
    .limit(9)
  return data ?? []
}

export async function registrarCotacaoMoageira(params: {
  moageira: 'barry_callebaut' | 'cargill' | 'olam'
  preco_brl: number
}) {
  await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cotacoes_mercado_externo')
    .upsert({
      produto: 'cacau',
      fonte: params.moageira,
      preco_brl: params.preco_brl,
      preco_usd: null,
      cambio_usd_brl: null,
      data_referencia: new Date().toISOString().split('T')[0],
    }, { onConflict: 'produto,fonte,data_referencia' })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/comercializacao/painel')
}

export async function getPrecoBahia() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cotacoes_mercado_externo')
    .select('*')
    .eq('produto', 'cacau')
    .eq('fonte', 'precodocacau')
    .order('data_referencia', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getUsdBrl() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cotacoes_mercado_externo')
    .select('*')
    .eq('produto', 'usd_brl')
    .eq('fonte', 'bcb')
    .order('data_referencia', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getUltimasCotacoesOrg(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cotacoes')
    .select('preco_cooperado, preco_externo, vigente_a_partir_de, observacoes')
    .eq('organizacao_id', orgId)
    .order('vigente_a_partir_de', { ascending: false })
    .limit(5)
  return (data ?? []).map(c => ({
    preco_cooperado: Number(c.preco_cooperado),
    preco_externo:   Number(c.preco_externo),
    data:            c.vigente_a_partir_de,
    obs:             c.observacoes,
  }))
}
