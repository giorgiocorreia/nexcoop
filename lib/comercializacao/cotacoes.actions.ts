'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarCotacoes() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', usuario.organizacao_id)
    .order('data', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  return data
}

export async function getCotacaoHoje(produto_id: string) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const hoje = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('produto_id', produto_id)
    .lte('data', hoje)
    .order('data', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data ?? null
}

export async function registrarCotacao(form: {
  produto_id: string
  data: string
  preco_externo: number
  preco_cooperado: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cotacoes')
    .upsert({
      ...form,
      organizacao_id: usuario.organizacao_id,
      registrado_por: usuario.id
    }, { onConflict: 'organizacao_id,produto_id,data' })
  if (error) throw new Error(error.message)
}
