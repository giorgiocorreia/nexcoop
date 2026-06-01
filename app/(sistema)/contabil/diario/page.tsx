import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import DiarioClient from './DiarioClient'

export const metadata = { title: 'Livro Diário — NexCoop' }

export default async function DiarioPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <DiarioClient orgId={ctx.orgId} />
}
