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
  observacoes?: string | null
  usuario_id: string
  usuario_email?: string
}) {
  const supabase = createAdminClient()
  const { data: novo, error } = await supabase
    .from('lancamentos')
    .insert(data)
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

  revalidatePath('/financeiro')
  return novo
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
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

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
