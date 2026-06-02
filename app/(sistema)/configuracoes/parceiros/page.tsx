import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import ParceirosClient from './ParceirosClient'

export const metadata = { title: 'Parceiros — NexCoop' }

export default async function ParceirosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  const orgId = ctx?.orgId ?? null
  if (!orgId) redirect('/onboarding')

  return <ParceirosClient orgId={orgId} />
}
