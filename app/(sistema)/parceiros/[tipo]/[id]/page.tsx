import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/supabase/impersonation'
import { redirect } from 'next/navigation'
import { getParceira } from '@/lib/parceiros/actions'
import GerenciarParceiraClient from './GerenciarParceiraClient'

export default async function GerenciarParceiraPage({
  params,
}: {
  params: { tipo: string; id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext()
  const orgId = ctx?.orgId ?? null
  if (!orgId) redirect('/onboarding')

  const parceira = await getParceira(params.id)
  if (!parceira || parceira.org_id !== orgId) redirect('/configuracoes?aba=parceiros')

  return <GerenciarParceiraClient parceira={parceira} orgId={orgId} />
}
