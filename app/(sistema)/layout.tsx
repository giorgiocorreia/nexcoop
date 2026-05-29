import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

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

  let organizacao = null
  if (usuario?.organizacao_id) {
    const { data: org } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', usuario.organizacao_id)
      .single()
    organizacao = org
  }

  const isSuperAdmin = usuario?.role === 'super_admin'

  // Verifica onboarding
  if (!isSuperAdmin && organizacao && !organizacao.onboarding_concluido) {
    redirect('/onboarding')
  }

  if (!isSuperAdmin && !assinaturaAtiva(organizacao)) {
    redirect('/assinar')
  }

  const usuarioComOrg = usuario ? { ...usuario, organizacao } : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f4' }}>
      <Sidebar usuario={usuarioComOrg} />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '2rem',
        minHeight: '100vh',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}