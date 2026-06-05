'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'

export async function listarCompradores() {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('compradores')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id as string)
    .order('nome')
  if (error) throw new Error(error.message)
  return data
}

export async function criarComprador(form: {
  nome: string
  tipo: 'exportador' | 'industria' | 'trader' | 'outro'
  cnpj?: string
  contato?: string
  email?: string
  telefone?: string
}) {
  const usuario = await getUsuarioLogado()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('compradores')
    .insert({ ...form, organizacao_id: usuario.organizacao_id as string })
  if (error) throw new Error(error.message)
}

export async function editarComprador(id: string, form: {
  nome?: string
  tipo?: 'exportador' | 'industria' | 'trader' | 'outro'
  cnpj?: string
  contato?: string
  email?: string
  telefone?: string
  ativo?: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('compradores')
    .update(form)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
