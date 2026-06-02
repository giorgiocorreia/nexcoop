import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import ConciliacaoClient from './ConciliacaoClient'

export const metadata = { title: 'Conciliação Bancária — NexCoop' }

export default async function ConciliacaoPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <ConciliacaoClient orgId={ctx.orgId} userId={ctx.usuarioId} />
}
