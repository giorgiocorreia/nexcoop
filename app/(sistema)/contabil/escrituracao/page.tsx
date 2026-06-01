import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import EscrituracaoClient from './EscrituracaoClient'

export const metadata = { title: 'Escrituração — NexCoop' }

export default async function EscrituracaoPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return <EscrituracaoClient orgId={ctx.orgId} userId={ctx.usuarioId} />
}
