'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { traduzirErro } from '@/lib/utils/erros'
import type { Oportunidade, OportunidadeLog, PerfilCaptacao, StatusOportunidade, FonteOportunidade, RadarFonte, RadarResultado } from '@/types/database'

export type OportunidadeLogComUsuario = OportunidadeLog & {
  usuario: { nome_completo: string } | null
}

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  return { supabase, usuarioId: user.id, orgId: usuario.organizacao_id as string }
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

function buildWebSearchPrompt(perfil: PerfilCaptacao | null, url: string, hoje: string): string {
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

  return `Acesse a URL ${url} e extraia todos os editais, chamadas públicas e oportunidades de financiamento listados.

Hoje é ${hoje}. Ignore editais cujo prazo de submissão já passou.

Para cada um compare com este perfil de organização:
${JSON.stringify(perfilJson, null, 2)}

Calcule a compatibilidade:
- score 70–100 → compatibilidade: "compativel"
- score 40–69  → compatibilidade: "parcial"
- score 0–39   → compatibilidade: "incompativel"

Retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON:
{"editais":[{"titulo":"string","financiador":"string ou null","descricao":"resumo em 2-3 frases","url_edital":"URL ou null","valor_estimado":numero_ou_null,"prazo_submissao":"YYYY-MM-DD ou null","areas_tematicas":[],"publico_alvo":[],"score":0,"compatibilidade":"parcial","motivo":"explicação"}]}

Se não encontrar editais, retorne: {"editais":[]}`
}

export async function executarRadar() {
  try {
    const { supabase, orgId } = await getCtx()

    // ── 1. Verifica API key ────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('[Radar] ANTHROPIC_API_KEY:', apiKey
      ? `definida (${apiKey.length} chars, prefixo: ${apiKey.slice(0, 14)}...)`
      : 'INDEFINIDA ⚠️ — varredura vai falhar')

    const [{ data: perfil }, { data: fontes }] = await Promise.all([
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
      supabase.from('radar_fontes').select('*').eq('organizacao_id', orgId).eq('ativo', true),
    ])

    console.log('[Radar] Fontes ativas encontradas:', fontes?.length ?? 0)
    if (!fontes?.length) return { error: 'Nenhuma fonte ativa cadastrada' }

    // ── 2. Carrega URLs já existentes para filtrar novidades ──────────────────
    const { data: existentes } = await supabase
      .from('radar_resultados')
      .select('url_edital')
      .eq('organizacao_id', orgId)
      .not('url_edital', 'is', null)
    const urlsExistentes = new Set<string>(
      (existentes ?? []).map(r => r.url_edital).filter((u): u is string => u != null)
    )
    console.log('[Radar] URLs já existentes:', urlsExistentes.size)

    const client = new Anthropic({ apiKey })
    const admin  = createAdminClient()
    const agora  = new Date().toISOString()
    const hoje   = agora.split('T')[0]
    const errosPorFonte: string[] = []
    const allNovosIds: string[] = []

    for (const fonte of fontes) {
      console.log(`[Radar] ── Fonte: "${fonte.nome}" | ${fonte.url}`)

      // ── 3. Claude com web_search ───────────────────────────────────────────
      let editais: ParsedEdital[] = []
      try {
        console.log(`[Radar] Chamando Claude com web_search para ${fonte.url}...`)
        const msg = await client.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 4096,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools:    [{ type: 'web_search_20250305', name: 'web_search' }] as any,
          messages: [{ role: 'user', content: buildWebSearchPrompt(perfil as PerfilCaptacao | null, fonte.url, hoje) }],
        })

        console.log(`[Radar] stop_reason=${msg.stop_reason} | blocos=${msg.content.length}`)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = msg.content
          .filter(b => b.type === 'text')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(b => (b as any).text as string)
          .join('\n')
        console.log(`[Radar] Texto total (${raw.length} chars):`, raw.slice(0, 500))

        const clean  = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const match  = clean.match(/\{[\s\S]*\}/)
        if (!match) {
          const errMsg = `[${fonte.nome}] JSON não encontrado na resposta: ${clean.slice(0, 200)}`
          console.warn('[Radar]', errMsg)
          errosPorFonte.push(errMsg)
          continue
        }

        let parsed: { editais?: ParsedEdital[] }
        try {
          parsed = JSON.parse(match[0])
        } catch (parseErr) {
          const errMsg = `[${fonte.nome}] JSON.parse falhou: ${parseErr} | trecho: ${match[0].slice(0, 200)}`
          console.error('[Radar]', errMsg)
          errosPorFonte.push(errMsg)
          continue
        }

        editais = parsed.editais ?? []
        console.log(`[Radar] Editais extraídos para "${fonte.nome}": ${editais.length}`)
      } catch (claudeErr) {
        const errMsg = `[${fonte.nome}] Chamada ao Claude falhou: ${claudeErr}`
        console.error('[Radar]', errMsg)
        errosPorFonte.push(errMsg)
        continue
      }

      // ── 4. Filtra editais vencidos e com URLs já existentes ──────────────
      editais = editais.filter(e => !e.prazo_submissao || e.prazo_submissao >= hoje)
      const antes = editais.length
      editais = editais.filter(e => !e.url_edital || !urlsExistentes.has(e.url_edital))
      console.log(`[Radar] "${fonte.nome}" — ${antes} encontrados, ${editais.length} novos após filtragem`)

      // ── 5. Salva resultados via admin ──────────────────────────────────────
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
        varredura_em:    agora,
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
          // Atualiza o set local para evitar duplicatas entre fontes
          editais.forEach(e => { if (e.url_edital) urlsExistentes.add(e.url_edital) })
          console.log(`[Radar] "${fonte.nome}" — ${inserted.length} editais inseridos`)
        }
      }

      await admin.from('radar_fontes').update({ ultima_varredura: agora }).eq('id', fonte.id)
    }

    const { data: allResults } = await supabase
      .from('radar_resultados')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('score', { ascending: false })

    console.log('[Radar] Varredura concluída. Total de resultados:', allResults?.length ?? 0, '| Novos:', allNovosIds.length)
    if (errosPorFonte.length) console.warn('[Radar] Erros por fonte:', errosPorFonte)

    revalidatePath('/captacao')
    return {
      data:     (allResults ?? []) as RadarResultado[],
      novosIds: allNovosIds,
      warnings: errosPorFonte.length ? errosPorFonte : undefined,
      mensagem: allNovosIds.length === 0
        ? 'Nenhuma novidade desde a última varredura'
        : undefined,
    }
  } catch (e) {
    console.error('[Radar] Erro geral não capturado:', e)
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
