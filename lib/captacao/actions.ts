'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { traduzirErro } from '@/lib/utils/erros'
import type { Oportunidade, OportunidadeLog, PerfilCaptacao, StatusOportunidade, FonteOportunidade, RadarFonte, RadarResultado } from '@/types/database'

export type OportunidadeLogComUsuario = OportunidadeLog & {
  usuario: { nome_completo: string } | null
}

async function getCtx() {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error('Não autenticado')
  return { supabase: ctx.supabase, usuarioId: ctx.usuarioId, orgId: ctx.orgId }
}

export async function listarOportunidades(filtro?: { status?: string; fonte?: string }) {
  try {
    const { supabase } = await getCtx()
    let query = supabase
      .from('oportunidades')
      .select('*')
      .neq('status', 'arquivado' as StatusOportunidade)
      .order('prazo_submissao', { ascending: true, nullsFirst: false })

    if (filtro?.status) query = query.eq('status', filtro.status as StatusOportunidade)
    if (filtro?.fonte)  query = query.eq('fonte',  filtro.fonte  as FonteOportunidade)

    const { data, error } = await query
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as Oportunidade[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarOportunidade(dados: Partial<Oportunidade>) {
  try {
    const { supabase, usuarioId, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('oportunidades')
      .insert({ ...dados, organizacao_id: orgId, criado_por: usuarioId })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: data.id,
      usuario_id: usuarioId,
      acao: 'criado',
      status_novo: (dados.status ?? 'identificado') as string,
      descricao: `Oportunidade criada: ${data.titulo}`,
    })

    revalidatePath('/captacao')
    return { data: data as Oportunidade }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function moverOportunidade(id: string, novoStatus: string) {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { data: atual } = await supabase
      .from('oportunidades')
      .select('status, titulo')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('oportunidades')
      .update({ status: novoStatus as StatusOportunidade })
      .eq('id', id)
    if (error) return { error: traduzirErro(error.message) }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: id,
      usuario_id: usuarioId,
      acao: 'movido',
      status_anterior: (atual?.status ?? null) as string | null,
      status_novo: novoStatus,
      descricao: `Movido de "${atual?.status}" para "${novoStatus}"`,
    })

    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarOportunidade(id: string, dados: Partial<Oportunidade>) {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { data, error } = await supabase
      .from('oportunidades')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: id,
      usuario_id: usuarioId,
      acao: 'editado',
      descricao: 'Dados da oportunidade atualizados',
    })

    revalidatePath('/captacao')
    return { data: data as Oportunidade }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function buscarOportunidade(id: string) {
  try {
    const { supabase } = await getCtx()
    const [{ data: oportunidade, error }, { data: logsRaw }] = await Promise.all([
      supabase.from('oportunidades').select('*').eq('id', id).single(),
      supabase
        .from('oportunidade_logs')
        .select('*')
        .eq('oportunidade_id', id)
        .order('criado_em', { ascending: false }),
    ])
    if (error) return { error: traduzirErro(error.message) }

    // Busca nomes dos usuários separadamente (join não inferido pelo tipo Database)
    const userIds = [...new Set(
      (logsRaw ?? []).map(l => l.usuario_id).filter((v): v is string => v != null)
    )]
    const { data: usuariosLogs } = userIds.length > 0
      ? await supabase.from('usuarios').select('id, nome_completo').in('id', userIds)
      : { data: [] as { id: string; nome_completo: string }[] }

    const userMap = Object.fromEntries((usuariosLogs ?? []).map(u => [u.id, u.nome_completo]))
    const logs: OportunidadeLogComUsuario[] = (logsRaw ?? []).map(l => ({
      ...(l as OportunidadeLog),
      usuario: l.usuario_id ? { nome_completo: userMap[l.usuario_id] ?? 'Usuário' } : null,
    }))

    return { data: { oportunidade: oportunidade as Oportunidade, logs } }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function salvarPerfilCaptacao(dados: Partial<PerfilCaptacao>) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('perfil_captacao')
      .upsert({ ...dados, organizacao_id: orgId }, { onConflict: 'organizacao_id' })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { data: data as PerfilCaptacao }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Radar: Fontes ─────────────────────────────────────────────────────────────

function validarUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function listarFontes() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('radar_fontes')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('criado_em')
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as RadarFonte[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function salvarFonte(dados: { nome: string; url: string; tipo: string; id?: string }) {
  try {
    if (!validarUrl(dados.url)) return { error: 'URL inválida — use um endereço http(s) válido.' }
    const { supabase, orgId } = await getCtx()
    let query
    if (dados.id) {
      query = supabase
        .from('radar_fontes')
        .update({ nome: dados.nome, url: dados.url, tipo: dados.tipo })
        .eq('id', dados.id)
        .select()
        .single()
    } else {
      query = supabase
        .from('radar_fontes')
        .insert({ nome: dados.nome, url: dados.url, tipo: dados.tipo, organizacao_id: orgId })
        .select()
        .single()
    }
    const { data, error } = await query
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { data: data as RadarFonte }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function removerFonte(id: string) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase.from('radar_fontes').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function toggleFonteAtivo(id: string, ativo: boolean) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase.from('radar_fontes').update({ ativo }).eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarFonte(id: string, dados: { nome: string; url: string; tipo: string }) {
  try {
    if (!validarUrl(dados.url)) return { error: 'URL inválida — use um endereço http(s) válido.' }
    const { supabase } = await getCtx()
    const { data, error } = await supabase
      .from('radar_fontes')
      .update({ nome: dados.nome, url: dados.url, tipo: dados.tipo })
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { data: data as RadarFonte }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function excluirOportunidade(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: op } = await supabase
      .from('oportunidades')
      .select('organizacao_id')
      .eq('id', id)
      .single()
    if (!op) return { error: 'Oportunidade não encontrada.' }
    if (op.organizacao_id !== orgId) return { error: 'Sem permissão.' }

    await supabase.from('oportunidade_logs').delete().eq('oportunidade_id', id)
    const { error } = await supabase.from('oportunidades').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }

    revalidatePath('/captacao')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Radar: Pipeline ───────────────────────────────────────────────────────────

export async function adicionarAoPipeline(resultadoId: string) {
  try {
    const { supabase } = await getCtx()

    const { data: resultado } = await supabase
      .from('radar_resultados')
      .select('*')
      .eq('id', resultadoId)
      .single()

    if (!resultado) return { error: 'Resultado não encontrado' }

    const dadosOp: Partial<Oportunidade> = {
      titulo:          resultado.titulo,
      financiador:     resultado.financiador ?? 'Não informado',
      fonte:           'nacional' as FonteOportunidade,
      fonte_url:       resultado.url_edital ?? null,
      area_tematica:   resultado.areas_tematicas ?? [],
      valor_estimado:  resultado.valor_estimado ?? null,
      prazo_submissao: resultado.prazo_submissao ?? null,
      observacoes:     resultado.descricao ?? null,
      status:          'identificado' as StatusOportunidade,
    }

    const res = await criarOportunidade(dadosOp)
    if (res.error || !res.data) return { error: res.error ?? 'Erro ao criar oportunidade' }

    await supabase
      .from('radar_resultados')
      .update({ adicionado_ao_pipeline: true, oportunidade_id: res.data.id })
      .eq('id', resultadoId)

    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Radar: Execução ───────────────────────────────────────────────────────────

interface ParsedEdital {
  titulo?: string
  financiador?: string
  descricao?: string
  url_edital?: string
  valor_estimado?: number | null
  prazo_submissao?: string | null
  areas_tematicas?: string[]
  publico_alvo?: string[]
  score?: number
  compatibilidade?: string
  motivo?: string
}

function chaveTitulo(fonteId: string, titulo: string): string {
  return `${fonteId}::${titulo.trim().toLowerCase()}`
}

function buildAnaliseFontePrompt(perfil: PerfilCaptacao | null, conteudo: string, hoje: string): string {
  const p = perfil
  const perfilJson = p
    ? {
        areas_tematicas: p.areas_tematicas ?? [],
        publicos_alvo:   p.publicos_alvo ?? [],
        abrangencia:     p.abrangencia ?? [],
        municipios:      p.municipios ?? [],
        porte_min:       p.porte_min ?? null,
        porte_max:       p.porte_max ?? null,
        idiomas:         p.idiomas ?? ['pt'],
        descricao_org:   p.descricao_org ?? 'cooperativa ou associação brasileira',
      }
    : null

  return `Analise o conteúdo abaixo e extraia todos os editais, chamadas públicas e oportunidades de financiamento.

Hoje é ${hoje}. Ignore editais com prazo de submissão já vencido.

CONTEÚDO:
${conteudo}

Perfil da organização:
${JSON.stringify(perfilJson, null, 2)}

Score de compatibilidade:
- 70–100 → compatibilidade: "compativel"
- 40–69  → compatibilidade: "parcial"
- 0–39   → compatibilidade: "incompativel"

Retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON:
{"editais":[{"titulo":"string","financiador":"string ou null","descricao":"resumo 2-3 frases","url_edital":"URL ou null","valor_estimado":numero_ou_null,"prazo_submissao":"YYYY-MM-DD ou null","areas_tematicas":[],"publico_alvo":[],"score":0,"compatibilidade":"parcial","motivo":"explicação"}]}

Se não encontrar editais: {"editais":[]}`
}

export async function executarRadar(forcarFonteIds?: string[]) {
  try {
    const { supabase, orgId } = await getCtx()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) console.warn('[Radar] ANTHROPIC_API_KEY indefinida — varredura vai falhar')

    const [{ data: perfil }, { data: fontes }] = await Promise.all([
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
      supabase.from('radar_fontes').select('*').eq('organizacao_id', orgId).eq('ativo', true),
    ])

    console.log('[Radar] Fontes ativas encontradas:', fontes?.length ?? 0)
    if (!fontes?.length) return { error: 'Nenhuma fonte ativa cadastrada' }

    const { data: existentes } = await supabase
      .from('radar_resultados')
      .select('url_edital, fonte_id, titulo')
      .eq('organizacao_id', orgId)
    const urlsExistentes = new Set<string>(
      (existentes ?? []).map(r => r.url_edital).filter((u): u is string => u != null)
    )
    const titulosExistentes = new Set<string>(
      (existentes ?? [])
        .filter(r => !r.url_edital)
        .map(r => chaveTitulo(r.fonte_id ?? '', r.titulo))
    )

    const client    = new Anthropic({ apiKey })
    const admin     = createAdminClient()
    const agora     = new Date()
    const agoraISO  = agora.toISOString()
    const hoje      = agoraISO.split('T')[0]
    const errosPorFonte: string[] = []
    const allNovosIds: string[] = []
    let tokensTotal = 0

    for (const fonte of fontes) {
      console.log(`[Radar] ── Fonte: "${fonte.nome}" | ${fonte.url}`)

      // Cache 24h
      const forcar = forcarFonteIds?.includes(fonte.id) ?? false
      if (!forcar && fonte.ultima_varredura) {
        const diffHoras = (agora.getTime() - new Date(fonte.ultima_varredura).getTime()) / 3_600_000
        if (diffHoras < 24) {
          console.log(`[Radar] "${fonte.nome}" — cache válido (${diffHoras.toFixed(1)}h atrás), pulando`)
          continue
        }
      }

      // Fetch via Jina.ai
      let conteudo = ''
      try {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(fonte.url)}`
        console.log(`[Radar] Jina fetch: ${jinaUrl}`)
        const jinaRes = await fetch(jinaUrl)
        conteudo = (await jinaRes.text()).slice(0, 2500)
        console.log(`[Radar] Jina "${fonte.nome}": ${conteudo.length} chars`)
      } catch (jinaErr) {
        const errMsg = `[${fonte.nome}] Jina fetch falhou: ${jinaErr}`
        console.error('[Radar]', errMsg)
        errosPorFonte.push(errMsg)
        continue
      }

      if (!conteudo.trim()) {
        const errMsg = `[${fonte.nome}] Jina retornou conteúdo vazio`
        console.warn('[Radar]', errMsg)
        errosPorFonte.push(errMsg)
        continue
      }

      // Claude Haiku
      let editais: ParsedEdital[] = []
      try {
        console.log(`[Radar] Chamando Claude Haiku para "${fonte.nome}"...`)
        const msg = await client.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages:   [{ role: 'user', content: buildAnaliseFontePrompt(perfil as PerfilCaptacao | null, conteudo, hoje) }],
        })

        const inputTok  = msg.usage.input_tokens  ?? 0
        const outputTok = msg.usage.output_tokens ?? 0
        tokensTotal += inputTok + outputTok
        console.log(`[Radar] Tokens "${fonte.nome}": in=${inputTok} out=${outputTok}`)

        const raw   = msg.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('\n')
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const match = clean.match(/\{[\s\S]*\}/)
        if (!match) {
          const errMsg = `[${fonte.nome}] JSON não encontrado: ${clean.slice(0, 200)}`
          console.warn('[Radar]', errMsg)
          errosPorFonte.push(errMsg)
          continue
        }

        try {
          const parsed: { editais?: ParsedEdital[] } = JSON.parse(match[0])
          editais = parsed.editais ?? []
        } catch (parseErr) {
          const errMsg = `[${fonte.nome}] JSON.parse falhou: ${parseErr}`
          console.error('[Radar]', errMsg)
          errosPorFonte.push(errMsg)
          continue
        }

        console.log(`[Radar] Editais extraídos para "${fonte.nome}": ${editais.length}`)
      } catch (claudeErr) {
        const errMsg = `[${fonte.nome}] Claude falhou: ${claudeErr}`
        console.error('[Radar]', errMsg)
        errosPorFonte.push(errMsg)
        continue
      }

      // Filtra vencidos e duplicatas (por URL quando existe; por título+fonte quando não há URL)
      editais = editais.filter(e => !e.prazo_submissao || e.prazo_submissao >= hoje)
      const antes = editais.length
      editais = editais.filter(e => {
        if (e.url_edital) return !urlsExistentes.has(e.url_edital)
        return !titulosExistentes.has(chaveTitulo(fonte.id, e.titulo ?? 'Sem título'))
      })
      console.log(`[Radar] "${fonte.nome}" — ${antes} encontrados, ${editais.length} novos`)

      const inserts = editais.map(edital => ({
        organizacao_id: orgId,
        fonte_id:        fonte.id,
        titulo:          edital.titulo ?? 'Sem título',
        descricao:       edital.descricao ?? null,
        financiador:     edital.financiador ?? null,
        url_edital:      edital.url_edital ?? null,
        valor_estimado:  edital.valor_estimado ?? null,
        prazo_submissao: edital.prazo_submissao ?? null,
        areas_tematicas: edital.areas_tematicas ?? [],
        publico_alvo:    edital.publico_alvo ?? [],
        score:           Math.min(100, Math.max(0, edital.score ?? 0)),
        compatibilidade: edital.compatibilidade ?? 'parcial',
        motivo:          edital.motivo ?? null,
        varredura_em:    agoraISO,
      }))

      if (inserts.length > 0) {
        const { data: inserted, error: insertErr } = await admin
          .from('radar_resultados')
          .insert(inserts)
          .select('id')
        if (insertErr) {
          console.error(`[Radar] Insert falhou para "${fonte.nome}":`, insertErr.message)
          errosPorFonte.push(`[${fonte.nome}] Insert falhou: ${insertErr.message}`)
        } else if (inserted) {
          allNovosIds.push(...inserted.map(r => r.id))
          editais.forEach(e => {
            if (e.url_edital) urlsExistentes.add(e.url_edital)
            else titulosExistentes.add(chaveTitulo(fonte.id, e.titulo ?? 'Sem título'))
          })
          console.log(`[Radar] "${fonte.nome}" — ${inserted.length} editais inseridos`)
        }
      }

      await admin.from('radar_fontes').update({ ultima_varredura: agoraISO }).eq('id', fonte.id)
    }

    const { data: allResults } = await supabase
      .from('radar_resultados')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('score', { ascending: false })

    // Haiku: ~$0.80/M input + $4.00/M output — weighted avg ~$1/M
    const custoEstimado = tokensTotal * 0.000001

    console.log('[Radar] Concluída. Total:', allResults?.length ?? 0, '| Novos:', allNovosIds.length, '| Tokens:', tokensTotal)
    if (errosPorFonte.length) console.warn('[Radar] Erros:', errosPorFonte)

    revalidatePath('/captacao')
    return {
      data:           (allResults ?? []) as RadarResultado[],
      novosIds:       allNovosIds,
      tokensTotal,
      custoEstimado,
      warnings:       errosPorFonte.length ? errosPorFonte : undefined,
      mensagem:       allNovosIds.length === 0
        ? 'Nenhuma novidade desde a última varredura'
        : undefined,
    }
  } catch (e) {
    console.error('[Radar] Erro geral:', e)
    return { error: String(e) }
  }
}

export interface RadarFonteResult {
  fonteNome: string
  novosResultados: RadarResultado[]
  novosIds: string[]
  tokens: number
  custoUSD: number
  cached: boolean
}

export async function executarRadarFonte(
  fonteId: string,
  forcar = false
): Promise<RadarFonteResult | { error: string }> {
  try {
    const { supabase, orgId } = await getCtx()

    const [{ data: fonte, error: fonteErr }, { data: perfil }] = await Promise.all([
      supabase.from('radar_fontes').select('*').eq('id', fonteId).eq('organizacao_id', orgId).single(),
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
    ])
    if (fonteErr || !fonte) return { error: `Fonte não encontrada: ${fonteErr?.message ?? fonteId}` }

    // Cache 24h
    const agora = new Date()
    if (!forcar && fonte.ultima_varredura) {
      const diffHoras = (agora.getTime() - new Date(fonte.ultima_varredura).getTime()) / 3_600_000
      if (diffHoras < 24)
        return { fonteNome: fonte.nome, novosResultados: [], novosIds: [], tokens: 0, custoUSD: 0, cached: true }
    }

    const { data: existentes } = await supabase
      .from('radar_resultados')
      .select('url_edital, fonte_id, titulo')
      .eq('organizacao_id', orgId)
    const urlsExistentes = new Set<string>(
      (existentes ?? []).map(r => r.url_edital).filter((u): u is string => u != null)
    )
    const titulosExistentes = new Set<string>(
      (existentes ?? [])
        .filter(r => !r.url_edital)
        .map(r => chaveTitulo(r.fonte_id ?? '', r.titulo))
    )

    const apiKey   = process.env.ANTHROPIC_API_KEY
    const client   = new Anthropic({ apiKey })
    const admin    = createAdminClient()
    const agoraISO = agora.toISOString()
    const hoje     = agoraISO.split('T')[0]

    // Jina.ai fetch
    let conteudo = ''
    try {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(fonte.url)}`
      const jinaRes = await fetch(jinaUrl)
      conteudo = (await jinaRes.text()).slice(0, 2500)
    } catch (jinaErr) {
      return { error: `[${fonte.nome}] Jina fetch falhou: ${jinaErr}` }
    }

    if (!conteudo.trim())
      return { error: `[${fonte.nome}] Jina retornou conteúdo vazio` }

    // Claude Haiku
    let editais: ParsedEdital[] = []
    let tokens = 0
    let custoUSD = 0
    try {
      const msg = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages:   [{ role: 'user', content: buildAnaliseFontePrompt(perfil as PerfilCaptacao | null, conteudo, hoje) }],
      })

      const inputTok  = msg.usage.input_tokens  ?? 0
      const outputTok = msg.usage.output_tokens ?? 0
      tokens   = inputTok + outputTok
      custoUSD = (inputTok * 0.0000008) + (outputTok * 0.000004)

      const raw   = msg.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('\n')
      const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          const parsed: { editais?: ParsedEdital[] } = JSON.parse(match[0])
          editais = parsed.editais ?? []
        } catch (_parseErr) { /* editais stays [] */ }
      }
    } catch (claudeErr) {
      return { error: `[${fonte.nome}] Claude falhou: ${claudeErr}` }
    }

    // Filtra vencidos e duplicatas (por URL quando existe; por título+fonte quando não há URL)
    editais = editais
      .filter(e => !e.prazo_submissao || e.prazo_submissao >= hoje)
      .filter(e => {
        if (e.url_edital) return !urlsExistentes.has(e.url_edital)
        return !titulosExistentes.has(chaveTitulo(fonte.id, e.titulo ?? 'Sem título'))
      })

    const inserts = editais.map(edital => ({
      organizacao_id: orgId,
      fonte_id:        fonte.id,
      titulo:          edital.titulo ?? 'Sem título',
      descricao:       edital.descricao ?? null,
      financiador:     edital.financiador ?? null,
      url_edital:      edital.url_edital ?? null,
      valor_estimado:  edital.valor_estimado ?? null,
      prazo_submissao: edital.prazo_submissao ?? null,
      areas_tematicas: edital.areas_tematicas ?? [],
      publico_alvo:    edital.publico_alvo ?? [],
      score:           Math.min(100, Math.max(0, edital.score ?? 0)),
      compatibilidade: edital.compatibilidade ?? 'parcial',
      motivo:          edital.motivo ?? null,
      varredura_em:    agoraISO,
    }))

    let novosResultados: RadarResultado[] = []
    const novosIds: string[] = []
    if (inserts.length > 0) {
      const { data: inserted, error: insertErr } = await admin
        .from('radar_resultados')
        .insert(inserts)
        .select()
      if (!insertErr && inserted) {
        novosResultados = inserted as RadarResultado[]
        novosIds.push(...inserted.map(r => r.id))
      }
    }

    await admin.from('radar_fontes').update({ ultima_varredura: agoraISO }).eq('id', fonte.id)
    revalidatePath('/captacao')

    return { fonteNome: fonte.nome, novosResultados, novosIds, tokens, custoUSD, cached: false }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function removerResultadoRadar(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { error } = await supabase
      .from('radar_resultados')
      .delete()
      .eq('id', id)
      .eq('organizacao_id', orgId)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Contatos e Propostas ──────────────────────────────────────────────────────

export interface DadosContato {
  data: string
  canal: string
  responsavel_id: string
  descricao: string
  proximo_passo: string
}

export async function registrarContato(
  oportunidadeId: string,
  dados: DadosContato
): Promise<{ error?: string }> {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { error } = await supabase.from('oportunidade_logs').insert({
      oportunidade_id: oportunidadeId,
      usuario_id:      usuarioId,
      acao:            'contato',
      descricao:       JSON.stringify(dados),
    })
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

export interface DadosProposta {
  data_envio:       string
  valor_solicitado: string
  status_proposta:  string
  documento_url:    string
  observacoes:      string
}

export async function registrarProposta(
  oportunidadeId: string,
  dados: DadosProposta
): Promise<{ error?: string }> {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { error } = await supabase.from('oportunidade_logs').insert({
      oportunidade_id: oportunidadeId,
      usuario_id:      usuarioId,
      acao:            'proposta',
      descricao:       JSON.stringify(dados),
    })
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/captacao')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}
