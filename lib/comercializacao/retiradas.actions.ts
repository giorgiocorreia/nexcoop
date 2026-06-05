'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarRetiradas() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('retiradas_externas')
    .select('*, produtos(nome, unidade), vendas_externas(lotes(codigo), compradores(nome))')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function registrarRetirada(form: {
  produto_id: string
  data_retirada: string
  destino: string
  quantidade_retirada: number
  numero_nf?: string
  venda_externa_id?: string
  safra_id?: string
  observacoes?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('retiradas_externas')
    .insert({
      ...form,
      organizacao_id: usuario.organizacao_id as string,
      responsavel_id: usuario.id
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  // Registrar saída no estoque físico
  const { error: e2 } = await supabase
    .from('movimentacoes_estoque_fisico')
    .insert({
      organizacao_id: usuario.organizacao_id as string,
      produto_id: form.produto_id,
      tipo: 'saida_entrega',
      quantidade: form.quantidade_retirada,
      responsavel_id: usuario.id,
      referencia_id: data.id,
      referencia_tipo: 'retirada_externa',
      numero_nf: form.numero_nf
    })
  if (e2) throw new Error(e2.message)
  return data
}

export async function confirmarPesoRetirada(id: string, quantidade_confirmada: number) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('retiradas_externas')
    .update({ quantidade_confirmada })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getEstoqueFisico() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('estoque_fisico')
    .select('*, produtos(nome, unidade)')
    .eq('organizacao_id', usuario.organizacao_id as string)
  if (error) throw new Error(error.message)
  return data
}
