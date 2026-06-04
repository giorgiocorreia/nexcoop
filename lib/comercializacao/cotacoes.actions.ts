'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarCotacoes() {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', orgId)
    .order('data', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  return data as unknown as Array<{
    id: string; data: string; produto_id: string
    preco_externo: number; preco_cooperado: number
    observacoes: string | null
    produtos: { nome: string; unidade: string }
  }>
}

export async function getCotacaoHoje(produto_id: string) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const hoje = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', orgId)
    .eq('produto_id', produto_id)
    .lte('data', hoje)
    .order('data', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as unknown as {
    id: string; data: string; produto_id: string
    preco_externo: number; preco_cooperado: number
    observacoes: string | null
    produtos: { nome: string; unidade: string }
  } | null
}

export async function registrarCotacao(form: {
  produto_id: string
  data: string
  preco_externo: number
  preco_cooperado: number
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cotacoes')
    .upsert({
      produto_id:      form.produto_id,
      data:            form.data,
      preco_externo:   form.preco_externo,
      preco_cooperado: form.preco_cooperado,
      observacoes:     form.observacoes ?? null,
      organizacao_id:  orgId,
      registrado_por:  usuario.id,
    }, { onConflict: 'organizacao_id,produto_id,data' })
  if (error) throw new Error(error.message)
}
