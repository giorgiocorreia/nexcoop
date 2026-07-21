import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import MainContent from '@/app/(sistema)/MainContent'
import { sairDaOrg } from '@/app/actions/impersonation'
import { sairDaOrgParceiro } from '@/app/actions/parceiro'
import { isParceiro } from '@/lib/parceiros/actions'
import { temaOrg } from '@/lib/tema'
import type { RoleUsuario } from '@/types/database'

function assinaturaAtiva(org: { subscription_status: string | null; trial_ends_at: string | null } | null): boolean {
  if (!org) return true
  const status = org.subscription_status
  if (!status) return true
  if (status === 'active') return true
  if (status === 'trialing') {
    if (!org.trial_ends_at) return true
    return new Date(org.trial_ends_at) > new Date()
  }
  return false
}

export default async function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = usuario?.role === 'super_admin'

  // Lê cookie de impersonation
  const cookieStore = await cookies()
  const impersonatingOrgId = isSuperAdmin
    ? (cookieStore.get('impersonating_org')?.value ?? null)
    : null
  const parceiroOrgId = !isSuperAdmin && !impersonatingOrgId
    ? (cookieStore.get('parceiro_org_id')?.value ?? null)
    : null

  let organizacao = null
  let impersonandoOrg = null

  if (impersonatingOrgId) {
    // Modo impersonation: carrega a org sendo visualizada
    const { data: impOrg } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', impersonatingOrgId)
      .single()
    impersonandoOrg = impOrg
    organizacao = impOrg
  } else if (usuario?.organizacao_id) {
    // Modo normal: org do próprio usuário
    const { data: org } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', usuario.organizacao_id)
      .single()
    organizacao = org
  }

  // Verifica se é parceiro antes dos redirects para não bloquear acesso ao /escritorio
  const parceiroStatus = user && !isSuperAdmin && !impersonatingOrgId ? await isParceiro(user.id) : false

  let nomeEmpresaParceira = ''
  let isParceiroAcessandoOrg = false
  let modulosAcessoParceiro: string[] = []

  if (parceiroStatus && user) {
    const adminSupabase = createAdminClient()

    if (parceiroOrgId) {
      // Parceiro acessando org cliente — carrega org e modulos em paralelo
      const [orgRes, vinculoRes] = await Promise.all([
        adminSupabase.from('organizacoes').select('*').eq('id', parceiroOrgId).single(),
        adminSupabase
          .from('profissionais_parceiros')
          .select('empresa:empresa_id(org_id, modulos_acesso, acesso_fiscal)')
          .eq('usuario_id', user.id)
          .eq('ativo', true),
      ])
      if (orgRes.data) {
        organizacao = orgRes.data
        isParceiroAcessandoOrg = true
        const vinculo = (vinculoRes.data ?? []).find((v: any) => v.empresa?.org_id === parceiroOrgId)
        const empresa = vinculo?.empresa as { modulos_acesso?: string[]; acesso_fiscal?: boolean } | undefined
        modulosAcessoParceiro = [...(empresa?.modulos_acesso ?? [])]
        if (empresa?.acesso_fiscal) modulosAcessoParceiro.push('fiscal_comercializacao')
      }
    } else {
      // Modo escritório normal — busca nome da empresa parceira
      const { data: empresaData } = await adminSupabase
        .from('profissionais_parceiros')
        .select('empresa:empresa_id(razao_social)')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .single()
      nomeEmpresaParceira = (empresaData?.empresa as any)?.razao_social || ''
    }
  }

  // Verificações de onboarding/assinatura apenas no modo normal (parceiros pulam)
  if (!isSuperAdmin && !impersonatingOrgId && !parceiroStatus) {
    if (organizacao && !organizacao.onboarding_concluido) redirect('/onboarding')
    if (!assinaturaAtiva(organizacao)) redirect('/assinar')
  }

  // Durante impersonation, faz o super admin aparecer como admin da org visualizada
  const usuarioComOrg = impersonandoOrg && usuario
    ? { ...usuario, role: 'org_admin' as RoleUsuario, funcoes: ['admin'], organizacao_id: impersonandoOrg.id, organizacao: impersonandoOrg } as any
    : usuario
      ? { ...usuario, organizacao }
      : null

  // Cor da marca da org (padrão por tipo + override manual) — vira CSS var
  // consumida por HERO em components/comercializacao/ui/tokens.ts, tematizando
  // Sidebar e PageLayout juntos. Sem org (super_admin puro), cai no fallback verde.
  const tema = temaOrg(organizacao as any)

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: '#f8f7f4',
      ['--nxc-marca-bg' as any]: tema.bg,
      ['--nxc-marca-fim' as any]: tema.base,
    }}>
      <Sidebar
        usuario={usuarioComOrg}
        isParceiro={parceiroStatus && !isParceiroAcessandoOrg}
        orgNome={parceiroStatus && !isParceiroAcessandoOrg ? nomeEmpresaParceira : undefined}
        isParceiroAcessandoOrg={isParceiroAcessandoOrg}
        modulosAcesso={modulosAcessoParceiro}
      />
      <MainContent>

        {/* Banner parceiro acessando org */}
        {isParceiroAcessandoOrg && organizacao && (
          <div className="nxc-sys-banner" style={{
            background: '#E6F7F1', borderBottom: '1px solid #0F766E44',
          }}>
            <span className="nxc-sys-banner__text" style={{ color: '#065f46' }}>
              📊 Módulo contábil:{' '}
              <strong>{(organizacao as any).nome}</strong>
            </span>
            <form action={sairDaOrgParceiro} className="nxc-sys-banner__action">
              <button type="submit" style={{
                fontSize: 12, fontWeight: 600, color: '#065f46',
                background: 'transparent', border: '1px solid #0F766E',
                borderRadius: 6, padding: '4px 14px', cursor: 'pointer',
              }}>
                ← Voltar ao Escritório
              </button>
            </form>
          </div>
        )}

        {/* Banner de troca de senha obrigatória (user_metadata.trocar_senha,
            setado pelo admin ao redefinir a senha; limpo no Perfil após a troca) */}
        {user.user_metadata?.trocar_senha && (
          <div className="nxc-sys-banner" style={{
            background: '#FEF2F2', borderBottom: '1px solid #FCA5A5',
          }}>
            <span className="nxc-sys-banner__text" style={{ color: '#991B1B' }}>
              🔒 Sua senha foi redefinida pelo administrador. Por segurança, altere-a agora.
            </span>
            <a href="/perfil" className="nxc-sys-banner__action" style={{
              fontSize: 12, fontWeight: 600, color: '#991B1B',
              border: '1px solid #DC2626', borderRadius: 6,
              padding: '4px 14px', textDecoration: 'none', whiteSpace: 'nowrap',
              display: 'inline-block',
            }}>
              Alterar senha
            </a>
          </div>
        )}

        {/* Banner de impersonation */}
        {impersonandoOrg && (
          <div className="nxc-sys-banner" style={{
            background: '#fef3c7',
            borderBottom: '1px solid #f59e0b',
          }}>
            <span className="nxc-sys-banner__text" style={{ color: '#78350f' }}>
              👁 Visualizando como administrador:{' '}
              <strong>{impersonandoOrg.nome}</strong>
            </span>
            <form action={sairDaOrg} className="nxc-sys-banner__action">
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#78350f',
                  background: 'transparent',
                  border: '1px solid #f59e0b',
                  borderRadius: 6,
                  padding: '4px 14px',
                  cursor: 'pointer',
                }}
              >
                Encerrar visita
              </button>
            </form>
          </div>
        )}

        <main style={{
          flex: 1,
          padding: '0 2rem 2rem 2rem',
          background: '#f8f7f4',
        }}>
          {children}
        </main>
      </MainContent>
    </div>
  )
}
