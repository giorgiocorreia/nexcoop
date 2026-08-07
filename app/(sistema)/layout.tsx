import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import MainContent from '@/app/(sistema)/MainContent'
import NavigationProgress from '@/components/NavigationProgress'
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
  const cookieStore = await cookies()

  // Auth + perfil em sequência curta; o resto em paralelo (navegação de menu).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = usuario?.role === 'super_admin'
  const impersonatingOrgId = isSuperAdmin
    ? (cookieStore.get('impersonating_org')?.value ?? null)
    : null
  const parceiroOrgId = !isSuperAdmin && !impersonatingOrgId
    ? (cookieStore.get('parceiro_org_id')?.value ?? null)
    : null

  // Org (impersonation OU própria) + flag de parceiro — em paralelo
  const orgIdParaCarregar = impersonatingOrgId ?? usuario?.organizacao_id ?? null
  const [orgRes, parceiroStatus] = await Promise.all([
    orgIdParaCarregar
      ? supabase.from('organizacoes').select('*').eq('id', orgIdParaCarregar).single()
      : Promise.resolve({ data: null as any }),
    (!isSuperAdmin && !impersonatingOrgId)
      ? isParceiro(user.id)
      : Promise.resolve(false),
  ])

  let organizacao = orgRes.data
  let impersonandoOrg = impersonatingOrgId ? orgRes.data : null

  let nomeEmpresaParceira = ''
  let nomeParceiro = ''
  let isParceiroAcessandoOrg = false
  let modulosAcessoParceiro: string[] = []
  let clienteNome = ''
  let clienteLogo: string | null = null

  if (parceiroStatus && user) {
    const adminSupabase = createAdminClient()

    // Nome do profissional — sempre no servidor (admin), sidebar não depende de RLS no client
    const { data: profNome } = await adminSupabase
      .from('profissionais_parceiros')
      .select('nome, empresa:empresa_id(razao_social, org_id, modulos_acesso)')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    const profs = profNome ?? []
    if (profs.length > 0) {
      nomeParceiro = (profs[0] as any).nome || ''
      // Nome do escritório do parceiro — sempre disponível (painel e modo cliente)
      nomeEmpresaParceira = ((profs[0] as any).empresa as any)?.razao_social || ''
    }

    if (parceiroOrgId) {
      // Parceiro acessando org cliente — carrega org e módulos
      const parceiroOrgRes = await adminSupabase
        .from('organizacoes')
        .select('*')
        .eq('id', parceiroOrgId)
        .single()
      if (parceiroOrgRes.data) {
        organizacao = parceiroOrgRes.data
        isParceiroAcessandoOrg = true
        clienteNome = (parceiroOrgRes.data as any).nome_curto
          || (parceiroOrgRes.data as any).nome
          || ''
        clienteLogo = (parceiroOrgRes.data as any).logo_url || null
        const vinculo = profs.find((v: any) => v.empresa?.org_id === parceiroOrgId)
        const empresa = vinculo?.empresa as { modulos_acesso?: string[] } | undefined
        modulosAcessoParceiro = [...(empresa?.modulos_acesso ?? [])]
      }
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
    <div
      className="nxc-shell"
      style={{
        display: 'flex', minHeight: '100vh', background: '#f8f7f4',
        width: '100%',
        ['--nxc-marca-bg' as any]: tema.bg,
        ['--nxc-marca-fim' as any]: tema.base,
      }}
    >
      <Sidebar
        usuario={usuarioComOrg}
        isParceiro={parceiroStatus && !isParceiroAcessandoOrg}
        orgNome={parceiroStatus ? nomeEmpresaParceira : undefined}
        isParceiroAcessandoOrg={isParceiroAcessandoOrg}
        modulosAcesso={modulosAcessoParceiro}
        parceiroNome={parceiroStatus ? nomeParceiro : undefined}
        clienteNome={isParceiroAcessandoOrg ? clienteNome : undefined}
        clienteLogo={isParceiroAcessandoOrg ? clienteLogo : undefined}
      />
      <MainContent>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        {/* Parceiro no cliente: chip com nome da org + volta ao MEU escritório
            (flutuante — não empurra o header verde). */}
        {isParceiroAcessandoOrg && organizacao && (
          <div className="nxc-parceiro-voltar">
            <div className="nxc-parceiro-voltar__chip" title={`Atendendo: ${clienteNome || (organizacao as any).nome}`}>
              {clienteLogo ? (
                <img src={clienteLogo} alt="" className="nxc-parceiro-voltar__logo" />
              ) : null}
              <span className="nxc-parceiro-voltar__cliente">
                {clienteNome || (organizacao as any).nome_curto || (organizacao as any).nome}
              </span>
            </div>
            <form action={sairDaOrgParceiro}>
              <button
                type="submit"
                className="nxc-parceiro-voltar__btn"
                title={nomeEmpresaParceira ? `Voltar para ${nomeEmpresaParceira}` : 'Voltar ao meu escritório'}
              >
                ← Meu escritório
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

        <main className="nxc-main-area" style={{ flex: 1 }}>
          {children}
        </main>
      </MainContent>
    </div>
  )
}
