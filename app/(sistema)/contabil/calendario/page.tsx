import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import CalendarioClient from './CalendarioClient'

export const metadata = { title: 'Calendário de Obrigações — NexCoop' }

export default async function CalendarioPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <CalendarioClient orgId={ctx.orgId} />
}
