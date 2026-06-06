'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isSuperAdmin } from '@/lib/permissoes'
import type { VinculoUsuario } from '@/types/database'

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuarioAtual } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuarioAtual) return null
  if (!isAdmin(usuarioAtual) && !isSuperAdmin(usuarioAtual)) return null
  return { usuarioAtual, admin: createAdminClient() }
}

export async function convidarUsuario(input: {
  email: string
  nome: string
  vinculo: VinculoUsuario | ''
  funcoes: string[]
}): Promise<{ error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Sem permissão.' }
  const { usuarioAtual, admin } = ctx

  let orgId: string | null = usuarioAtual.organizacao_id
  if (!orgId && isSuperAdmin(usuarioAtual)) {
    const cookieStore = await cookies()
    orgId = cookieStore.get('impersonating_org')?.value ?? null
  }
  if (!orgId) return { error: 'Organização não encontrada.' }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email.trim(), {
    data: {
      nome_completo: input.nome.trim(),
      organizacao_id: orgId,
      vinculo: input.vinculo || null,
      funcoes: input.funcoes,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) return { error: 'E-mail já está cadastrado na plataforma.' }
    return { error: error.message }
  }

  const { error: insertError } = await admin
    .from('usuarios')
    .insert({
      id: data.user.id,
      organizacao_id: orgId,
      email: input.email.trim(),
      nome_completo: input.nome.trim(),
      vinculo: (input.vinculo || null) as VinculoUsuario | null,
      funcoes: input.funcoes,
      role: 'membro',
      ativo: false,
    })

  if (insertError) return { error: `Convite enviado, mas erro ao configurar: ${insertError.message}` }
  return {}
}

export async function atualizarUsuario(
  id: string,
  dados: { funcoes: string[]; vinculo: VinculoUsuario | null }
): Promise<{ error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Sem permissão.' }
  const { usuarioAtual, admin } = ctx

  const { data: alvo } = await admin.from('usuarios').select('organizacao_id, role').eq('id', id).single()
  if (!alvo) return { error: 'Usuário não encontrado.' }
  if (alvo.role === 'super_admin') return { error: 'Não é possível editar um super_admin.' }
  if (!isSuperAdmin(usuarioAtual) && alvo.organizacao_id !== usuarioAtual.organizacao_id) {
    return { error: 'Sem permissão.' }
  }

  const { error } = await admin.from('usuarios').update({
    funcoes: dados.funcoes,
    vinculo: dados.vinculo,
  }).eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function toggleAtivo(id: string, ativo: boolean): Promise<{ error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Sem permissão.' }
  const { usuarioAtual, admin } = ctx

  const { data: alvo } = await admin.from('usuarios').select('organizacao_id, role').eq('id', id).single()
  if (!alvo) return { error: 'Usuário não encontrado.' }
  if (alvo.role === 'super_admin') return { error: 'Não é possível desativar um super_admin.' }
  if (!isSuperAdmin(usuarioAtual) && alvo.organizacao_id !== usuarioAtual.organizacao_id) {
    return { error: 'Sem permissão.' }
  }

  const { error } = await admin.from('usuarios').update({ ativo }).eq('id', id)
  if (error) return { error: error.message }
  return {}
}