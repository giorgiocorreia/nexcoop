'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizacaoId, getUsuarioLogado } from '@/lib/auth'

export async function listarSessoesAbertas() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessoes_caixa')
    .select(`
      id, status, saldo_inicial_especie, hora_abertura, usuario_id,
      usuarios!sessoes_caixa_usuario_id_fkey(nome_completo)
    `)
    .eq('organizacao_id', orgId)
    .eq('status', 'aberta')
    .order('hora_abertura', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listarSessoesFechadas() {
  const orgId = await getOrganizacaoId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessoes_caixa')
    .select(`
      id, status, saldo_inicial_especie, hora_abertura, hora_fechamento,
      total_saidas_especie, total_pix, saldo_final_especie, usuario_id,
      usuarios!sessoes_caixa_usuario_id_fkey(nome_completo)
    `)
    .eq('organizacao_id', orgId)
    .eq('status', 'fechada')
    .order('hora_fechamento', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function forcarFechamentoSessao(sessaoId: string): Promise<{ error?: string }> {
  const usuario = await getUsuarioLogado()
  const funcoes = (usuario.funcoes ?? []) as string[]
  if (!funcoes.includes('admin')) return { error: 'Sem permissão.' }
  const supabase = createAdminClient()

  const { data: movs } = await supabase
    .from('movimentacoes_conta')
    .select('valor_financeiro, forma_pagamento')
    .eq('sessao_caixa_id', sessaoId)

  const totalEspecie = (movs ?? []).reduce((acc, m) =>
    m.forma_pagamento === 'especie' && m.valor_financeiro != null ? acc + Math.abs(m.valor_financeiro) : acc, 0)
  const totalPix = (movs ?? []).reduce((acc, m) =>
    m.forma_pagamento === 'pix' && m.valor_financeiro != null ? acc + Math.abs(m.valor_financeiro) : acc, 0)

  const { error } = await supabase
    .from('sessoes_caixa')
    .update({
      hora_fechamento: new Date().toISOString(),
      total_saidas_especie: totalEspecie,
      total_pix: totalPix,
      status: 'fechada',
      observacoes_fechamento: `Fechamento forçado pelo admin (${usuario.email})`,
    })
    .eq('id', sessaoId)

  if (error) return { error: error.message }
  return {}
}
