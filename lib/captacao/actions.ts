'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
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
    if (error) return { error: error.message }
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
    if (error) return { error: error.message }

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
    if (error) return { error: error.message }

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
    if (error) return { error: error.message }

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
    if (error) return { error: error.message }

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
    if (error) return { error: error.message }
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
    if (error) return { error: error.message }
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
    if (error) return { error: error.message }
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
    if (error) return { error: error.message }
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
    if (error) return { error: error.message }
    revalidatePath('/captacao')
    return { ok: true }
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

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPrompt(perfil: PerfilCaptacao | null, nomeFonte: string, texto: string): string {
  const p = perfil
  const perfilTxt = p
    ? [
        `Áreas temáticas de interesse: ${p.areas_tematicas?.join(', ') || 'não informado'}`,
        `Público-alvo: ${p.publicos_alvo?.join(', ') || 'não informado'}`,
        `Abrangência geográfica: ${p.abrangencia?.join(', ') || 'não informado'}`,
        `Municípios: ${p.municipios?.join(', ') || 'não informado'}`,
        `Porte mínimo de projeto: ${p.porte_min != null ? `R$ ${p.porte_min.toLocaleString('pt-BR')}` : 'não informado'}`,
        `Porte máximo de projeto: ${p.porte_max != null ? `R$ ${p.porte_max.toLocaleString('pt-BR')}` : 'não informado'}`,
        `Idiomas aceitos: ${p.idiomas?.join(', ') || 'português'}`,
        `Descrição da organização: ${p.descricao_org || 'cooperativa ou associação brasileira'}`,
      ].join('\n')
    : 'Perfil não configurado — avalie de forma geral para cooperativas e associações brasileiras.'

  return `Você é especialista em captação de recursos para cooperativas e associações brasileiras.

Analise o conteúdo da página "${nomeFonte}" abaixo e identifique todos os editais, chamadas públicas e oportunidades de financiamento presentes.

PERFIL DA ORGANIZAÇÃO:
${perfilTxt}

Para cada oportunidade encontrada, calcule a compatibilidade com o perfil acima:
- score 70–100 → compatibilidade: "compativel" (forte alinhamento de área, público e porte)
- score 40–69  → compatibilidade: "parcial"     (algum alinhamento, mas com limitações)
- score 0–39   → compatibilidade: "incompativel" (pouco ou nenhum alinhamento)

Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON:
{
  "editais": [
    {
      "titulo": "string",
      "financiador": "string ou null",
      "descricao": "resumo em 2–3 frases",
      "url_edital": "URL direta ou null",
      "valor_estimado": número ou null,
      "prazo_submissao": "YYYY-MM-DD ou null",
      "areas_tematicas": ["array de strings"],
      "publico_alvo": ["array de strings"],
      "score": 0-100,
      "compatibilidade": "compativel|parcial|incompativel",
      "motivo": "explicação da compatibilidade em 1–2 frases"
    }
  ]
}

Se não encontrar editais, retorne: {"editais":[]}

CONTEÚDO DA PÁGINA:
${texto}`
}

export async function executarRadar() {
  try {
    const { supabase, orgId } = await getCtx()

    const [{ data: perfil }, { data: fontes }] = await Promise.all([
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', orgId).maybeSingle(),
      supabase.from('radar_fontes').select('*').eq('organizacao_id', orgId).eq('ativo', true),
    ])

    if (!fontes?.length) return { error: 'Nenhuma fonte ativa cadastrada' }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const agora = new Date().toISOString()

    for (const fonte of fontes) {
      // Limpa resultados antigos não adicionados ao pipeline
      await supabase
        .from('radar_resultados')
        .delete()
        .eq('fonte_id', fonte.id)
        .eq('adicionado_ao_pipeline', false)

      // Busca conteúdo da URL
      let texto = ''
      try {
        const resp = await fetch(fonte.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextCoop/1.0)' },
          signal: AbortSignal.timeout(15000),
        })
        const html = await resp.text()
        texto = stripHtml(html).slice(0, 6000)
      } catch {
        continue
      }

      if (!texto.trim()) continue

      // Chama Claude para análise
      let editais: ParsedEdital[] = []
      try {
        const msg = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [{ role: 'user', content: buildPrompt(perfil as PerfilCaptacao | null, fonte.nome, texto) }],
        })
        const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(clean)
        editais = parsed.editais ?? []
      } catch {
        continue
      }

      // Salva resultados
      for (const edital of editais) {
        await supabase.from('radar_resultados').insert({
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
        })
      }

      // Atualiza ultima_varredura da fonte
      await supabase.from('radar_fontes').update({ ultima_varredura: agora }).eq('id', fonte.id)
    }

    // Retorna todos os resultados atuais ordenados por score
    const { data: allResults } = await supabase
      .from('radar_resultados')
      .select('*')
      .eq('organizacao_id', orgId)
      .order('score', { ascending: false })

    revalidatePath('/captacao')
    return { data: (allResults ?? []) as RadarResultado[] }
  } catch (e) {
    return { error: String(e) }
  }
}
