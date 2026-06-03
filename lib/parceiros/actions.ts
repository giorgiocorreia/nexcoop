'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { TipoParceria, MODULOS_POR_TIPO } from './types'

export async function getParceiras(orgId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('empresas_parceiras')
    .select('*, profissionais:profissionais_parceiros(*)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getParceira(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('empresas_parceiras')
    .select('*, profissionais:profissionais_parceiros(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function criarParceira(data: {
  org_id: string
  razao_social: string
  cnpj?: string
  email_contato: string
  telefone?: string
  tipo: TipoParceria
  cidade?: string
  estado?: string
  site?: string
  observacoes?: string
}) {
  const supabase = createAdminClient()
  const modulos = MODULOS_POR_TIPO[data.tipo] || []
  const { data: nova, error } = await supabase
    .from('empresas_parceiras')
    .insert({ ...data, modulos_acesso: modulos, status: 'pendente' })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Envia convite por e-mail
  await supabase.auth.admin.inviteUserByEmail(data.email_contato, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/parceiros/${data.tipo}/aceitar?empresa=${nova.id}`,
    data: { tipo_parceria: data.tipo, empresa_id: nova.id },
  })

  revalidatePath('/configuracoes')
  return nova
}

export async function atualizarStatusParceira(id: string, status: 'ativo' | 'inativo') {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('empresas_parceiras')
    .update({ status, ...(status === 'ativo' ? { aceito_em: new Date().toISOString() } : {}) })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
  revalidatePath('/escritorio')
}

export async function reenviarConviteParceira(empresaId: string, email: string) {
  const supabase = createAdminClient()
  await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/parceiros/contabilidade/aceitar?empresa=${empresaId}`,
    data: { tipo_parceria: 'contabilidade', empresa_id: empresaId },
  })
  revalidatePath('/configuracoes')
}

export async function removerParceira(id: string) {
  const supabase = createAdminClient()
  await supabase.from('profissionais_parceiros').delete().eq('empresa_id', id)
  await supabase.from('empresas_parceiras').delete().eq('id', id)
  revalidatePath('/configuracoes')
}

export async function atualizarModulosAcesso(id: string, modulos: string[]) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('empresas_parceiras')
    .update({ modulos_acesso: modulos })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}

// ── PROFISSIONAIS ────────────────────────────────────────────────────────────

export async function getProfissionais(empresaId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profissionais_parceiros')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return data || []
}

export async function convidarProfissional(data: {
  empresa_id: string
  nome: string
  email: string
  cargo?: string
  crc?: string
  nivel: 'responsavel' | 'operador' | 'consultor'
}) {
  const supabase = createAdminClient()

  // Verifica se usuário já existe
  const { data: existente } = await supabase
    .from('profissionais_parceiros')
    .select('id')
    .eq('empresa_id', data.empresa_id)
    .eq('email', data.email)
    .single()

  if (existente) throw new Error('Este e-mail já está cadastrado nesta empresa.')

  const { data: prof, error } = await supabase
    .from('profissionais_parceiros')
    .insert({ ...data, ativo: true, convidado_em: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Envia convite
  await supabase.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/aceitar-convite?profissional=${prof.id}`,
    data: { profissional_id: prof.id, empresa_id: data.empresa_id },
  })

  revalidatePath('/escritorio/equipe')
  return prof
}

export async function toggleProfissional(id: string, ativo: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profissionais_parceiros')
    .update({ ativo })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio/equipe')
}

export async function vincularUsuarioAoProfissional(profissionalId: string, usuarioId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profissionais_parceiros')
    .update({ usuario_id: usuarioId, aceito_em: new Date().toISOString() })
    .eq('id', profissionalId)
  if (error) throw new Error(error.message)
}

// ── PAINEL DO ESCRITÓRIO ─────────────────────────────────────────────────────

export async function getEmpresasDoUsuario(usuarioId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profissionais_parceiros')
    .select('*, empresa:empresa_id(*, org:org_id(nome, tipo))')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
  if (error) throw new Error(error.message)
  return data || []
}

export async function aceitarVinculo(empresaId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('empresas_parceiras')
    .update({ status: 'ativo', aceito_em: new Date().toISOString() })
    .eq('id', empresaId)
  if (error) throw new Error(error.message)
  revalidatePath('/escritorio')
}

export async function isParceiro(usuarioId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profissionais_parceiros')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .limit(1)
    .single()
  return !!data
}

export async function getOrgIdsDoParceiro(usuarioId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profissionais_parceiros')
    .select('empresa:empresa_id(org_id, status, modulos_acesso)')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
  return (data || [])
    .map((d: any) => d.empresa)
    .filter((e: any) => e?.status === 'ativo')
    .map((e: any) => e.org_id)
}
