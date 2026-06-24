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
    .order('vigente_a_partir_de', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  return data as unknown as Array<{
    id: string; vigente_a_partir_de: string; produto_id: string
    preco_externo: number; preco_cooperado: number
    observacoes: string | null
    produtos: { nome: string; unidade: string }
  }>
}

export async function getCotacaoAtiva(produto_id: string) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', orgId)
    .eq('produto_id', produto_id)
    .lte('vigente_a_partir_de', new Date().toISOString())
    .order('vigente_a_partir_de', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as unknown as {
    id: string; vigente_a_partir_de: string; produto_id: string
    preco_externo: number; preco_cooperado: number
    observacoes: string | null
    produtos: { nome: string; unidade: string }
  } | null
}

// Mantém getCotacaoHoje como alias para compatibilidade com chamadas existentes
export const getCotacaoHoje = getCotacaoAtiva

export async function registrarCotacao(form: {
  produto_id: string
  vigente_a_partir_de: string
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
    .insert({
      produto_id:           form.produto_id,
      vigente_a_partir_de:  form.vigente_a_partir_de,
      preco_externo:        form.preco_externo,
      preco_cooperado:      form.preco_cooperado,
      observacoes:          form.observacoes ?? null,
      organizacao_id:       orgId,
      registrado_por:       usuario.id,
    })
  if (error) throw new Error(error.message)
}
