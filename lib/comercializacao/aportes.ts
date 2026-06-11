'use server'

import { createClient } from '@/lib/supabase/server'

export async function criarSolicitacaoAporte(
  organizacaoId: string,
  sessaoCaixaId: string,
  valor: number,
  motivo: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase.from('solicitacoes_aporte').insert({
    organizacao_id: organizacaoId,
    sessao_caixa_id: sessaoCaixaId,
    operador_id: user.id,
    valor,
    motivo,
    status: 'pendente',
  })

  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function getSolicitacoesPendentes(organizacaoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('solicitacoes_aporte')
    .select(`
      id,
      valor,
      motivo,
      created_at,
      status,
      operador:usuarios!operador_id(nome)
    `)
    .eq('organizacao_id', organizacaoId)
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function marcarSolicitacaoAtendida(solicitacaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('solicitacoes_aporte')
    .update({
      status: 'atendida',
      atendida_por: user.id,
      atendida_em: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)

  if (error) throw new Error(error.message)
  return { ok: true }
}
