import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DeParaClient from './DeParaClient'
import { getEmpresaIdDoUsuario, getPlanoEscritorio } from '@/lib/parceiros/planoEscritorioActions'

export const metadata = { title: 'De/Para Contas — NexCoop' }

export default async function DeParaPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  const { data: usuario } = await supabaseAuth
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single()

  const isParceiro = usuario?.role === 'parceiro'

  let planoEscritorio: any[] = []
  if (isParceiro) {
    const empresaId = await getEmpresaIdDoUsuario(user.id)
    if (empresaId) planoEscritorio = await getPlanoEscritorio(empresaId)
  }

  return (
    <DeParaClient
      orgId={ctx.orgId}
      userId={ctx.usuarioId}
      isParceiro={isParceiro}
      planoEscritorio={planoEscritorio}
    />
  )
}
