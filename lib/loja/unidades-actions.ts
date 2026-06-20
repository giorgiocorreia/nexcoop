'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function listarUnidades(orgId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('loja_unidades')
    .select('*')
    .eq('org_id', orgId)
    .eq('ativo', true)
    .order('nome')
  return data ?? []
}

export async function criarUnidade(orgId: string, dados: { nome: string; sigla: string }) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('loja_unidades')
    .insert({ org_id: orgId, nome: dados.nome.trim(), sigla: dados.sigla.trim(), ativo: true })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/loja/produtos')
  revalidatePath('/loja/compras/nova')
  return { data }
}

export async function toggleUnidade(id: string, ativo: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('loja_unidades')
    .update({ ativo })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/loja/produtos')
  return { ok: true }
}
