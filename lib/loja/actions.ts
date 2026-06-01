'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { traduzirErro } from '@/lib/utils/erros'
import type { LojaFornecedor, LojaProduto } from '@/types/database'

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  return { supabase, usuarioId: user.id, orgId: usuario.organizacao_id as string }
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

export async function listarFornecedores() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .select('*')
      .eq('org_id', orgId)
      .order('nome')
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as LojaFornecedor[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarFornecedor(
  dados: Pick<LojaFornecedor, 'nome' | 'cnpj' | 'telefone' | 'email'>
) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .insert({ ...dados, org_id: orgId, ativo: true })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja')
    return { data: data as LojaFornecedor }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarFornecedor(
  id: string,
  dados: Partial<Pick<LojaFornecedor, 'nome' | 'cnpj' | 'telefone' | 'email' | 'ativo'>>
) {
  try {
    const { supabase } = await getCtx()
    const { data, error } = await supabase
      .from('loja_fornecedores')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja/produtos')
    return { data: data as LojaFornecedor }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function toggleFornecedorAtivo(id: string, ativo: boolean) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase
      .from('loja_fornecedores')
      .update({ ativo })
      .eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function excluirFornecedor(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: fornecedor } = await supabase
      .from('loja_fornecedores')
      .select('org_id')
      .eq('id', id)
      .single()
    if (!fornecedor) return { error: 'Fornecedor não encontrado.' }
    if ((fornecedor as { org_id: string }).org_id !== orgId) return { error: 'Sem permissão.' }
    const { error } = await supabase.from('loja_fornecedores').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/fornecedores')
    revalidatePath('/loja')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export type LojaProdutoComFornecedor = LojaProduto & {
  loja_fornecedores: { nome: string } | null
}

export async function listarProdutos() {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('*, loja_fornecedores(nome)')
      .eq('org_id', orgId)
      .order('nome')
    if (error) return { error: traduzirErro(error.message) }
    return { data: data as unknown as LojaProdutoComFornecedor[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarProduto(
  dados: Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'preco_cooperado' | 'estoque_minimo' | 'fornecedor_id'>
) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .insert({ ...dados, org_id: orgId, estoque_atual: 0, ativo: true })
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    revalidatePath('/loja')
    return { data: data as LojaProduto }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarProduto(
  id: string,
  dados: Partial<Pick<LojaProduto, 'nome' | 'categoria' | 'unidade' | 'preco_normal' | 'preco_cooperado' | 'estoque_minimo' | 'fornecedor_id' | 'ativo'>>
) {
  try {
    const { supabase } = await getCtx()
    const { data, error } = await supabase
      .from('loja_produtos')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    return { data: data as LojaProduto }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  try {
    const { supabase } = await getCtx()
    const { error } = await supabase
      .from('loja_produtos')
      .update({ ativo })
      .eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function excluirProduto(id: string) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data: produto } = await supabase
      .from('loja_produtos')
      .select('org_id')
      .eq('id', id)
      .single()
    if (!produto) return { error: 'Produto não encontrado.' }
    if ((produto as { org_id: string }).org_id !== orgId) return { error: 'Sem permissão.' }
    const { error } = await supabase.from('loja_produtos').delete().eq('id', id)
    if (error) return { error: traduzirErro(error.message) }
    revalidatePath('/loja/produtos')
    revalidatePath('/loja')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}
