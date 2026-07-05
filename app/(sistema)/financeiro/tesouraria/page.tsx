import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import TesourariaClient from './TesourariaClient'

export const metadata = { title: 'Tesouraria — NexCoop' }

export default async function TesourariaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  if (!ctx) redirect('/login')

  return (
    <TesourariaClient
      orgId={ctx.orgId}
      usuarioId={ctx.usuarioId}
    />
  )
}