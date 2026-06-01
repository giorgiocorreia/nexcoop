import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import NFeClient from './NFeClient'

export const metadata = { title: 'NF-e — NexCoop' }

export default async function NFePage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <NFeClient orgId={ctx.orgId} userId={ctx.usuarioId} />
}
