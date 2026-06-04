'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getPlanoEscritorio(empresaId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('plano_contas_escritorio')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('codigo')
  if (error) throw new Error(error.message)
  return data || []
}

export async function criarContaEscritorio(data: {
  empresa_id: string
  codigo: string
  nome: string
  tipo: string
  nivel: number
  aceita_lancamento: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('plano_contas_escritorio')
    .insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio/plano-de-contas')
}

export async function atualizarContaEscritorio(id: string, data: {
  codigo?: string
  nome?: string
  tipo?: string
  aceita_lancamento?: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('plano_contas_escritorio')
    .update(data)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio/plano-de-contas')
}

export async function removerContaEscritorio(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('plano_contas_escritorio')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio/plano-de-contas')
}

export async function getEmpresaIdDoUsuario(usuarioId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profissionais_parceiros')
    .select('empresa_id')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .single()
  return data?.empresa_id || null
}
