import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DeParaClient from './DeParaClient'

export const metadata = { title: 'De/Para Contas — NexCoop' }

export default async function DeParaPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <DeParaClient orgId={ctx.orgId} userId={ctx.usuarioId} />
}
