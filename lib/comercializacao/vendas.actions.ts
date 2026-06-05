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

export async function atualizarStatusVenda(id: string, status: 'rascunho' | 'confirmada' | 'entregue' | 'paga') {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendas_externas')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
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
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendas_externas')
    .update(form)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
