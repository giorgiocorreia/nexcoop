'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarProdutos() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id)
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
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('produtos')
    .insert({ ...form, organizacao_id: usuario.organizacao_id })
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
    .update(form)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
