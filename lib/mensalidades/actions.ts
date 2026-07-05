'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Mensalidade } from '@/types/database'

function formatarMesRef(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export async function registrarPagamentoMensalidade(
  mensalidadeId: string,
  dataPagamento: string,
  observacoes?: string | null
): Promise<{ mensalidade: Mensalidade } | { error: string }> {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  const supabase = createAdminClient()

  const { data: antes, error: errAntes } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .eq('organizacao_id', orgId)
    .single<Mensalidade>()

  if (errAntes || !antes) return { error: 'Mensalidade não encontrada.' }
  if (antes.status === 'pago') return { error: 'Esta mensalidade já está paga.' }

  const { data, error } = await supabase
    .from('mensalidades')
    .update({
      status: 'pago',
      data_pagamento: dataPagamento,
      observacoes: observacoes?.trim() || null,
      atualizado_em: new Date().toISOString(),
      usuario_id: usuario.id,
    })
    .eq('id', mensalidadeId)
    .select()
    .single<Mensalidade>()

  if (error) return { error: error.message }

  try {
    const { criarLancamento } = await import('@/lib/financeiro/actions')
    await criarLancamento({
      organizacao_id: orgId,
      tipo: 'receita',
      status: 'pago',
      descricao: `Mensalidade — ${formatarMesRef(antes.mes_referencia)}`,
      valor: Number(antes.valor),
      data_competencia: antes.mes_referencia.split('T')[0].slice(0, 10),
      data_pagamento: dataPagamento,
      cooperado_id: antes.cooperado_id,
      numero_documento: mensalidadeId.slice(0, 8),
      observacoes: observacoes?.trim() || `Referência mensalidade ${formatarMesRef(antes.mes_referencia)}`,
      usuario_id: usuario.id,
      usuario_email: usuario.email ?? undefined,
    })
  } catch (e) {
    console.error('[financeiro] Erro ao criar lançamento mensalidade:', e)
  }

  revalidatePath('/mensalidades')
  revalidatePath(`/mensalidades/${mensalidadeId}`)
  revalidatePath('/financeiro')

  return { mensalidade: data }
}