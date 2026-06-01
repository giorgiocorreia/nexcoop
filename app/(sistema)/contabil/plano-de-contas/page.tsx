import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import PlanoContasClient from './PlanoContasClient'

export const metadata = { title: 'Plano de Contas — NexCoop' }

export default async function PlanoContasPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <PlanoContasClient orgId={ctx.orgId} />
}
