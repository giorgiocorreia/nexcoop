'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { registrarLog } from '@/lib/audit/logger'
import type { TipoLancamento, StatusLancamento } from '@/types/database'

export async function criarLancamento(data: {
  organizacao_id: string
  tipo: TipoLancamento
  status: StatusLancamento
  descricao: string
  valor: number
  data_competencia: string
  data_vencimento?: string | null
  data_pagamento?: string | null
  numero_documento?: string | null
  cooperado_id?: string | null
  conta_id?: string | null
  conta_destino_id?: string | null
  observacoes?: string | null
  usuario_id: string
  usuario_email?: string
}) {
  const supabase = createAdminClient()
  const { data: novo, error } = await supabase
    .from('lancamentos')
    .insert({
      organizacao_id:   data.organizacao_id,
      tipo:             data.tipo as TipoLancamento,
      status:           data.status as StatusLancamento,
      descricao:        data.descricao,
      valor:            data.valor,
      data_competencia: data.data_competencia,
      data_vencimento:  data.data_vencimento ?? null,
      data_pagamento:   data.data_pagamento ?? null,
      numero_documento: data.numero_documento ?? null,
      cooperado_id:     data.cooperado_id ?? null,
      conta_id:         data.conta_id ?? null,
      conta_destino_id: data.conta_destino_id ?? null,
      observacoes:      data.observacoes ?? null,
      usuario_id:       data.usuario_id,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  registrarLog({
    org_id: data.organizacao_id,
    usuario_id: data.usuario_id,
    usuario_email: data.usuario_email,
    acao: 'criar',
    modulo: 'financeiro',
    descricao: `Lançamento criado: ${data.descricao} — R$ ${data.valor.toFixed(2)}`,
    dados_depois: { id: novo.id, tipo: data.tipo, descricao: data.descricao, valor: data.valor },
  }).catch(e => console.error('[audit]', e))

  try {
    const { tentarClassificarAutomaticamente } = await import('@/lib/contabil/classificacao-automatica')
    await tentarClassificarAutomaticamente({
      org_id: data.organizacao_id,
      lancamento_id: novo.id,
      tipo: data.tipo,
      status: data.status,
      descricao: data.descricao,
      valor: data.valor,
      data_competencia: data.data_competencia,
      observacoes: data.observacoes,
      usuario_id: data.usuario_id,
    })
  } catch (e) {
    console.error('[contabil] Erro na classificação automática:', e)
  }

  revalidatePath('/financeiro')
  return novo
}

export async function classificarLancamentoExistente(lancamentoId: string) {
  const supabase = createAdminClient()
  const { data: lanc } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('id', lancamentoId)
    .single()
  if (!lanc?.usuario_id) return

  const { tentarClassificarAutomaticamente } = await import('@/lib/contabil/classificacao-automatica')
  await tentarClassificarAutomaticamente({
    org_id: lanc.organizacao_id,
    lancamento_id: lanc.id,
    tipo: lanc.tipo,
    status: lanc.status,
    descricao: lanc.descricao,
    valor: Number(lanc.valor),
    data_competencia: lanc.data_competencia,
    observacoes: lanc.observacoes,
    usuario_id: lanc.usuario_id,
  })
}

export async function editarLancamento(
  id: string,
  orgId: string,
  usuarioId: string,
  dados: Partial<{ status: StatusLancamento; descricao: string; valor: number; observacoes: string }>
) {
  const supabase = createAdminClient()

  const { data: antes } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('lancamentos')
    .update({
      ...(dados.status    ? { status:    dados.status as StatusLancamento } : {}),
      ...(dados.descricao ? { descricao: dados.descricao }                  : {}),
      ...(dados.valor     !== undefined ? { valor: dados.valor }            : {}),
      ...(dados.observacoes !== undefined ? { observacoes: dados.observacoes } : {}),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (dados.status === 'cancelado') {
    await supabase.from('partidas').delete().eq('lancamento_id', id)
  }

  registrarLog({
    org_id: orgId,
    usuario_id: usuarioId,
    acao: 'editar',
    modulo: 'financeiro',
    descricao: `Lançamento editado: ${antes?.descricao || id}`,
    dados_antes: antes,
    dados_depois: dados,
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/financeiro')
  if (dados.status === 'cancelado') revalidatePath('/contabil/escrituracao')
}

export async function deletarLancamento(id: string, orgId: string, usuarioId: string) {
  const supabase = createAdminClient()

  const { data: antes } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw new Error(error.message)

  registrarLog({
    org_id: orgId,
    usuario_id: usuarioId,
    acao: 'deletar',
    modulo: 'financeiro',
    descricao: `Lançamento deletado: ${antes?.descricao || id}`,
    dados_antes: antes,
  }).catch(e => console.error('[audit]', e))

  revalidatePath('/financeiro')
}
