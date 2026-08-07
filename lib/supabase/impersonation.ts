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
  /** Só populado quando o contexto vem de um parceiro (cookie parceiro_org_id).
   *  Reflete `modulos_acesso` revalidado no banco NESTE request — nunca confiar em valor
   *  cacheado/antigo. Telas/actions do fiscal devem checar aqui, não assumir acesso total. */
  modulosPermitidos?: string[]
  /** Idem — reflete empresas_parceiras.acesso_fiscal revalidado neste request. */
  acessoFiscal?: boolean
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

  // Parceiro acessando org cliente via cookie.
  // O cookie só prova que o vínculo era válido no momento em que foi criado (ver
  // app/api/parceiros/acessar-org/route.ts). Vínculo pode ter sido revogado, empresa
  // desativada, ou modulos_acesso alterado desde então — por isso revalidamos tudo
  // no banco a cada request, em vez de confiar cegamente no orgId do cookie.
  const parceiroOrgId = cookieStore.get('parceiro_org_id')?.value ?? null
  if (parceiroOrgId) {
    const admin = createAdminClient()
    // NÃO selecionar acesso_fiscal aqui: a coluna pode não existir em bases
    // onde a migration 062 ainda não rodou — o select quebrava o contexto
    // inteiro (ctx=null → /login → /dashboard → /contabil → loop).
    // Flag fiscal vem de modulos_acesso contendo 'fiscal_comercializacao'.
    const { data: vinculos, error: vinculoErr } = await admin
      .from('profissionais_parceiros')
      .select('empresa:empresa_id(org_id, status, modulos_acesso)')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (vinculoErr) {
      console.error('[getOrgContext] parceiro vinculo:', vinculoErr.message)
    }

    const vinculoValido: any = (vinculos ?? []).find((v: any) =>
      v.empresa?.org_id === parceiroOrgId &&
      v.empresa?.status === 'ativo' &&
      Array.isArray(v.empresa?.modulos_acesso) &&
      v.empresa.modulos_acesso.includes('contabil')
    )

    if (vinculoValido) {
      const mods = (vinculoValido.empresa.modulos_acesso as string[]) ?? []
      return {
        supabase: admin,
        orgId: parceiroOrgId,
        usuarioId: user.id,
        isImpersonating: false,
        modulosPermitidos: mods,
        acessoFiscal: mods.includes('fiscal_comercializacao'),
      }
    }

    // Vínculo não passou na revalidação (revogado, empresa inativa, módulo removido):
    // limpa cookie inválido e cai no contexto normal do usuário abaixo —
    // nunca lançar erro aqui, isso quebraria a navegação de quem nem é parceiro.
    try {
      cookieStore.delete('parceiro_org_id')
    } catch {
      /* cookies() em alguns contextos é read-only */
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
