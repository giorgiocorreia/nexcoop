'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getOrgId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!data?.organizacao_id) throw new Error('Organização não encontrada')
  return { supabase, orgId: data.organizacao_id }
}

export async function listarGruposOrg() {
  const { supabase, orgId } = await getOrgId()

  const { data, error } = await supabase
    .from('grupos_colaboradores')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('nome')

  if (error) throw new Error(error.message)
  const grupos = data ?? []

  // Enriquecer com contagens
  const enriched = await Promise.all(grupos.map(async g => {
    const [{ count: membros }, { count: reps }] = await Promise.all([
      supabase
        .from('cotas_cooperado')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', g.id)
        .eq('tipo_cota', 'colaboradora'),
      supabase
        .from('grupo_representantes')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', g.id)
        .eq('ativo', true),
    ])
    const totalMembros = membros ?? 0
    const votosDisponiveis = Math.floor(totalMembros / 10)
    const repsNecessarios = votosDisponiveis
    const repsAtivos = reps ?? 0
    return {
      ...g,
      total_membros:      totalMembros,
      votos_disponiveis:  votosDisponiveis,
      reps_necessarios:   repsNecessarios,
      reps_ativos:        repsAtivos,
      status_ok:          repsNecessarios === 0 || repsAtivos >= repsNecessarios,
    }
  }))

  return enriched
}

export async function criarGrupoOrg(dados: { nome: string; cnpj?: string; descricao?: string }) {
  const { orgId } = await getOrgId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grupos_colaboradores')
    .insert({ organizacao_id: orgId, ...dados })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes/grupos')
  return data
}

export async function alterarStatusGrupo(grupoId: string, ativo: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('grupos_colaboradores')
    .update({ ativo })
    .eq('id', grupoId)
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes/grupos')
}
