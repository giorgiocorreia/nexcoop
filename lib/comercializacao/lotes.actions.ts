'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarLotes() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('lotes')
    .select('*, safras(ano, descricao), produtos(nome, unidade)')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function criarLote(form: {
  safra_id: string
  produto_id: string
  codigo: string
  peso_total_kg: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('lotes')
    .insert({ ...form, organizacao_id: usuario.organizacao_id as string, status: 'aberto' })
  if (error) throw new Error(error.message)
}

export async function editarLote(id: string, form: {
  codigo?: string
  peso_total_kg?: number
  status?: 'aberto' | 'em_venda' | 'entregue'
  observacoes?: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('lotes')
    .update(form)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getProximoCodigoLote() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const ano = new Date().getFullYear()
  const { count } = await supabase
    .from('lotes')
    .select('*', { count: 'exact', head: true })
    .eq('organizacao_id', usuario.organizacao_id as string)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `LOTE-${ano}-${seq}`
}
