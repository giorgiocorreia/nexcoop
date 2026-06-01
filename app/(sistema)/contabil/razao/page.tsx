import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import RazaoClient from './RazaoClient'

export const metadata = { title: 'Livro Razão — NexCoop' }

export default async function RazaoPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <RazaoClient orgId={ctx.orgId} />
}
