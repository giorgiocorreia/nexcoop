'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function getUsuarioLogado() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin client garante que RLS não bloqueia a leitura do próprio perfil
  const admin = createAdminClient()
  const { data: usuario, error } = await admin
    .from('usuarios')
    .select('id, organizacao_id, role, funcoes, nome_completo, email, ativo')
    .eq('id', user.id)
    .single()

  if (error || !usuario) redirect('/login')

  // toggleAtivo (configuracoes/usuarios/actions.ts) só marca a flag — sem essa
  // checagem aqui, um usuário "desativado" continuava com sessão válida e
  // conseguia usar o sistema normalmente (bug real, 2026-07-06).
  if (usuario.ativo === false) {
    await supabase.auth.signOut()
    redirect('/login?erro=inativo')
  }

  return usuario
}

/**
 * Org do usuário logado. Para contador parceiro (sem linha em `usuarios`),
 * usa o cookie `parceiro_org_id` via getOrgContext — necessário para
 * /contabil/nfe e actions de comercialização/fiscal no modo escritório.
 */
export async function getOrganizacaoId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (usuario?.organizacao_id) return usuario.organizacao_id as string

  const { getOrgContext } = await import('@/lib/supabase/impersonation')
  const ctx = await getOrgContext()
  if (ctx?.orgId) return ctx.orgId

  throw new Error('Organização não encontrada')
}
