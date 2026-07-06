'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function criarSolicitacaoAporte(
  organizacaoId: string,
  sessaoCaixaId: string,
  valor: number,
  motivo: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('solicitacoes_aporte').insert({
    organizacao_id: organizacaoId,
    sessao_caixa_id: sessaoCaixaId,
    operador_id: user.id,
    valor,
    motivo: motivo || null,
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
      operador:usuarios!operador_id(nome_completo)
    `)
    .eq('organizacao_id', organizacaoId)
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

// Entrada de dinheiro na sessão de caixa que não vem de venda de produto nem de
// aporte manual do operador (ex: integralização de cota paga no cadastro do
// cooperado) — grava em aportes_sangrias (origem='cota_cooperado') sem exigir a
// reautenticação de admin do fluxo manual (registrarAporteSangria), já que o
// dinheiro já foi validado no pagamento da cota. Só espécie mexe no saldo físico
// contado no caixa (saldo_especie_calculado); pix/cartão só somam nos totais
// informativos da sessão (migration 063), pra não inflar uma contagem de cédulas
// com dinheiro que nunca passou pela gaveta.
export async function registrarEntradaAutomatica(params: {
  organizacaoId: string
  sessaoCaixaId: string
  formaPagamento: 'especie' | 'pix' | 'cartao'
  valor: number
  usuarioId: string
  observacoes?: string
}): Promise<void> {
  if (params.valor <= 0) return

  const supabase = createAdminClient()

  const { error } = await supabase.from('aportes_sangrias').insert({
    organizacao_id: params.organizacaoId,
    sessao_caixa_id: params.sessaoCaixaId,
    tipo: 'aporte',
    valor: params.valor,
    forma_pagamento: params.formaPagamento,
    origem: 'cota_cooperado',
    autorizado_por: params.usuarioId,
    executado_por: params.usuarioId,
    observacoes: params.observacoes ?? null,
  })
  if (error) throw new Error(error.message)

  if (params.formaPagamento === 'especie') {
    const { data: sessao } = await supabase
      .from('sessoes_caixa')
      .select('saldo_especie_calculado')
      .eq('id', params.sessaoCaixaId)
      .single()
    await supabase
      .from('sessoes_caixa')
      .update({ saldo_especie_calculado: Number(sessao?.saldo_especie_calculado ?? 0) + params.valor })
      .eq('id', params.sessaoCaixaId)
    return
  }

  const campo = params.formaPagamento === 'pix' ? 'total_entradas_pix' : 'total_entradas_cartao'
  const { data: sessao } = await supabase
    .from('sessoes_caixa')
    .select(campo)
    .eq('id', params.sessaoCaixaId)
    .single()
  await supabase
    .from('sessoes_caixa')
    .update({ [campo]: Number((sessao as any)?.[campo] ?? 0) + params.valor } as any)
    .eq('id', params.sessaoCaixaId)
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
