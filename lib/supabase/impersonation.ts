import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createAdminClient } from './admin'
import { createClient } from './server'

export interface OrgContext {
  supabase: SupabaseClient<Database>
  orgId: string
  usuarioId: string
  isImpersonating: boolean
}

/**
 * Retorna o cliente Supabase correto e o org_id para usar em server actions e pages.
 * - Se o cookie "impersonating_org" estiver ativo (super_admin em modo impersonation):
 *   usa createAdminClient() para bypassar a RLS e o orgId do cookie.
 * - Caso contrário: usa createClient() normal (RLS ativa) e busca orgId do usuário autenticado.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const cookieStore = await cookies()
  const impersonatingOrgId = cookieStore.get('impersonating_org')?.value ?? null

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return null

  if (impersonatingOrgId) {
    return {
      supabase: createAdminClient(),
      orgId: impersonatingOrgId,
      usuarioId: user.id,
      isImpersonating: true,
    }
  }

  const { data: usuario } = await supabaseAuth
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.organizacao_id) return null

  return {
    supabase: supabaseAuth,
    orgId: usuario.organizacao_id as string,
    usuarioId: user.id,
    isImpersonating: false,
  }
}
