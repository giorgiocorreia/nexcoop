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
  loja_produto_id?: string | null
}) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtos')
    .insert({ ...form, unidade: form.unidade as TipoProdutoUnidade, organizacao_id: orgId } as any)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function editarProduto(id: string, form: {
  nome: string
  categoria: string
  unidade: string
  ativo: boolean
  loja_produto_id?: string | null
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('produtos')
    .update({ ...form, unidade: form.unidade as TipoProdutoUnidade } as any)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Produtos da Loja Agropecuária disponíveis pra vincular a um produto da
// Comercialização (ponte "Enviar para a Loja", ver ponte-loja.actions.ts).
export async function listarProdutosLojaParaVinculo() {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id
  if (!orgId) throw new Error('Usuário sem organização')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('loja_produtos')
    .select('id, nome')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}
