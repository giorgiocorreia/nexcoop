'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

import type { TipoProdutoUnidade } from '@/types/database'

export async function listarProdutos() {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('nome')
  if (error) throw new Error(error.message)
  return data
}

export async function criarProduto(form: {
  nome: string
  categoria: string
  unidade: string
}) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('produtos')
    .insert({ ...form, unidade: form.unidade as TipoProdutoUnidade, organizacao_id: orgId })
  if (error) throw new Error(error.message)
}

export async function editarProduto(id: string, form: {
  nome: string
  categoria: string
  unidade: string
  ativo: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('produtos')
    .update({ ...form, unidade: form.unidade as TipoProdutoUnidade })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
