import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import BalanceteClient from './BalanceteClient'

export const metadata = { title: 'Balancete — NexCoop' }

export default async function BalancetePage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <BalanceteClient orgId={ctx.orgId} />
}
