'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarVendas() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendas_externas')
    .select('*, safras(ano, descricao), lotes(codigo), compradores(nome, tipo)')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function criarVenda(form: {
  safra_id: string
  lote_id: string
  comprador_id: string
  data_venda: string
  quantidade_kg: number
  preco_kg: number
  taxa_comercializacao_pct: number
  custos_logistica: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendas_externas')
    .insert({ ...form, organizacao_id: usuario.organizacao_id as string, status: 'rascunho' })
  if (error) throw new Error(error.message)
}

export async function atualizarStatusVenda(id: string, novoStatus: 'rascunho' | 'confirmada' | 'entregue' | 'pago') {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendas_externas')
    .update({ status: novoStatus })
    .eq('id', id)
    .eq('organizacao_id', usuario.organizacao_id as string)
  if (error) throw new Error(error.message)

  // Propagar status para lotes
  if (novoStatus === 'entregue') {
    const { data: venda } = await supabase
      .from('vendas_externas')
      .select('lote_id')
      .eq('id', id)
      .eq('organizacao_id', usuario.organizacao_id as string)
      .single()
    if (venda?.lote_id) {
      await supabase
        .from('lotes')
        .update({ status: 'entregue' } as any)
        .eq('id', venda.lote_id)
        .eq('organizacao_id', usuario.organizacao_id as string)
    }
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/comercializacao/vendas')
}

export async function editarVenda(id: string, form: {
  comprador_id?: string
  data_venda?: string
  quantidade_kg?: number
  preco_kg?: number
  taxa_comercializacao_pct?: number
  custos_logistica?: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendas_externas')
    .update(form)
    .eq('id', id)
    .eq('organizacao_id', usuario.organizacao_id as string)
  if (error) throw new Error(error.message)
}
