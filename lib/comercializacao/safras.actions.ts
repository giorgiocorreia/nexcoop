'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarSafras() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('safras')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('ano', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getSafraAtiva() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('safras')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .eq('status', 'em_andamento')
    .maybeSingle()
  return data
}

export async function criarSafra(form: {
  ano: number
  descricao?: string
  estimativa_kg?: number
  taxa_comercializacao: number
  status: 'planejamento' | 'em_andamento' | 'encerrada'
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  if (form.status === 'em_andamento') {
    await supabase
      .from('safras')
      .update({ status: 'encerrada' })
      .eq('organizacao_id', usuario.organizacao_id as string)
      .eq('status', 'em_andamento')
  }
  const { error } = await supabase
    .from('safras')
    .insert({ ...form, organizacao_id: usuario.organizacao_id as string })
  if (error) throw new Error(error.message)
}

export async function editarSafra(id: string, form: {
  ano?: number
  descricao?: string
  estimativa_kg?: number
  taxa_comercializacao?: number
  status?: 'planejamento' | 'em_andamento' | 'encerrada'
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  if (form.status === 'em_andamento') {
    await supabase
      .from('safras')
      .update({ status: 'encerrada' })
      .eq('organizacao_id', usuario.organizacao_id as string)
      .eq('status', 'em_andamento')
      .neq('id', id)
  }
  const { error } = await supabase
    .from('safras')
    .update(form)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
