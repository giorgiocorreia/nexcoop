import { createAdminClient } from '@/lib/supabase/admin'

export interface Sessao {
  id: string
  telefone: string
  nome: string | null
  estado: string
  perfil_lead: Record<string, unknown>
  historico: Array<{ role: 'user' | 'assistant'; content: string; ts: string }>
  criado_em: string
  atualizado_em: string
}

export async function buscarOuCriarSessao(telefone: string, nome?: string): Promise<Sessao> {
  const supabase = createAdminClient()

  const { data: existente } = await supabase
    .from('whatsapp_sessoes')
    .select('*')
    .eq('telefone', telefone)
    .single()

  if (existente) {
    // Verifica se sessão expirou (24h sem atividade)
    const ultimaAtividade = new Date(existente.atualizado_em)
    const agora = new Date()
    const horasInativo = (agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60)

    if (horasInativo > 24) {
      // Reseta histórico mas mantém perfil_lead
      await supabase
        .from('whatsapp_sessoes')
        .update({
          historico: [],
          estado: 'ativo',
          atualizado_em: new Date().toISOString(),
        })
        .eq('telefone', telefone)

      return { ...existente, historico: [], estado: 'ativo' }
    }

    return existente
  }

  // Cria nova sessão
  const { data: nova } = await supabase
    .from('whatsapp_sessoes')
    .insert({
      telefone,
      nome: nome || null,
      estado: 'ativo',
      perfil_lead: {},
      historico: [],
    })
    .select('*')
    .single()

  return nova!
}

export async function atualizarSessao(
  telefone: string,
  updates: Partial<Pick<Sessao, 'estado' | 'perfil_lead' | 'historico' | 'nome'> & { transferido_em: string }>
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('whatsapp_sessoes')
    .update({
      ...updates,
      atualizado_em: new Date().toISOString(),
    })
    .eq('telefone', telefone)
}

export async function adicionarMensagemHistorico(
  sessao: Sessao,
  role: 'user' | 'assistant',
  content: string
): Promise<Sessao['historico']> {
  const novaMsg = { role, content, ts: new Date().toISOString() }
  const historico = [...(sessao.historico || []), novaMsg]

  // Mantém últimas 20 mensagens para não explodir o contexto
  const historicoTrimmed = historico.slice(-20)

  await atualizarSessao(sessao.telefone, { historico: historicoTrimmed })

  return historicoTrimmed
}
